# AI 模型设置（server 持久化 + web 设置页）设计

日期：2026-07-10
状态：待评审

## 背景与目标

现在四个 AI 用途的模型全靠环境变量指定（`AI_COMMENT_MODEL` / `AI_ANALYST_MODEL` / `AI_DEEPDIVE_MODEL` / `AI_CHAT_MODEL`），API key 也散在 `.env` 里。换模型要改文件、记格式、重启心智负担。

本功能把模型配置和 API key 全部迁进 server 持久化存储（SQLite），web 端提供 `/settings` 设置页：每种用途可分别选 provider、模型、思考深度；API key 在界面里管理，加密落库。环境变量彻底退出。

## 需求决策（已与用户确认）

| 维度 | 决策 |
|---|---|
| 范围 | 模型选择 + API key 都进设置界面（方案 B） |
| 环境变量 | 彻底切换：server 不再读 `AI_*_MODEL` / `*_API_KEY`；首启一次性从 env 导入存量配置 |
| 存储 | 现有 SQLite（drizzle 迁移），不新增配置文件 |
| key 安全 | AES-256-GCM 加密，主密钥存本地文件（不用 macOS 钥匙串，避免 headless 授权弹窗） |
| UI 形态 | 独立 `/settings` 页，顶栏齿轮入口；不用弹窗 |
| 思考深度 | 每个用途一个可选下拉，对应原 `:low` / `:high` 后缀能力，默认跟随模型默认 |
| 模型目录 | 只列 pi-ai 内置目录（`builtinModels()`），暂不支持自定义接入点 |

## 非目标

- 不支持自建中转 / OpenAI 兼容自定义端点。
- 不做多用户、鉴权、配额（见文末云服务演进备忘）。
- 不做设置的导入导出。
- 前端不加测试（沿用 repo 现状：只有 server 测试）。

## 数据模型

两张新表（drizzle 迁移自动建）：

```ts
export const aiModelSettings = sqliteTable("ai_model_settings", {
  role: text("role").primaryKey(),        // comment | analyst | deepDive | chat
  provider: text("provider").notNull(),
  modelId: text("model_id").notNull(),
  thinkingLevel: text("thinking_level"),  // 空 = 跟随模型默认
  updatedAt: text("updated_at").notNull(),
});

export const providerKeys = sqliteTable("provider_keys", {
  provider: text("provider").primaryKey(),
  secret: text("secret").notNull(),       // "v1:<iv>:<authTag>:<密文>"，均 base64
  updatedAt: text("updated_at").notNull(),
});
```

语义沿用现状：

- 某 role 无行 = 该层停用（快评不跑、分析员不升级、深研/追问返回「未配置」）。
- `chat` 无行时回退用 `analyst` 的配置。
- `openai-codex` 这个 provider 不走 API key，用本机 `~/.codex/auth.json` 的 OAuth 登录态，`provider_keys` 里不会有它的行。

## 加密

- 主密钥：32 字节随机数，首次需要时生成，写 `journal/charts/data/ai-secret.key`（0600，目录已 git 忽略）。
- 算法：AES-256-GCM，每条密文独立随机 IV，authTag 一并存储（篡改即解密失败）。
- 密文格式 `v1:<iv>:<authTag>:<密文>`，`v1` 前缀留给以后换加密方案（如主密钥迁到云端密钥管理服务）。
- 威胁模型：防数据库文件被拷走/误传时明文泄露；不防本机被攻破（密钥文件与数据库同机）。本地单人应用，此强度合理。
- 密钥文件丢失/损坏：所有 key 解密失败，视为未配置，界面提示「需重新填写」；重新填 key 时若文件不在则重新生成。不崩、不清库。

## server 接口

新增 `routes/settings.ts`：

| 接口 | 行为 |
|---|---|
| `GET /api/settings/ai` | 配置总览：四个 role 各自的 provider/modelId/thinkingLevel；已配 key 的 provider 列表（掩码尾四位如 `••••ab12` + updatedAt，永不回明文）；目录里已消失的模型标注 `stale: true` |
| `PUT /api/settings/ai/roles/:role` | body `{ provider, modelId, thinkingLevel? }`；写入前校验 provider+模型在目录里、thinkingLevel 合法，否则 400 带原因 |
| `DELETE /api/settings/ai/roles/:role` | 停用该层 |
| `PUT /api/settings/ai/keys/:provider` | body `{ key }`，加密落库；校验 provider 在目录里且不是纯 OAuth 型（如 `openai-codex`），否则 400 |
| `DELETE /api/settings/ai/keys/:provider` | 删除该 provider 的 key |
| `GET /api/settings/ai/catalog` | pi-ai 内置目录：provider 列表 + 各自模型列表（id、显示名）+ 每个 provider 的 key 状态（`configured` / `missing` / `oauth`） |
| `POST /api/settings/ai/test` | body `{ provider, modelId, thinkingLevel? }`：发一次最小请求，返回 `{ ok: true }` 或 `{ ok: false, error }`（错误原文透出） |

## 内部改造

- 新增 `ai/settingsStore.ts`：启动时从 DB 加载进内存缓存，写接口更新后写穿刷缓存（better-sqlite3 同步读写）。
- `models.ts` 的 `aiConfig()` 保持同步签名不变，内部改从 settingsStore 取——所有调用点（scheduler / eventFilter / chat / deepDive / symbols）一行不改，改设置后下一次调用即生效，不用重启。
- key 解析链：`openai-codex` → 现有 codex OAuth；其他 provider → `provider_keys` 解密。`agentSession.ts` 的 `getApiKey` 从「只管 codex」扩成这条链。环境变量不再参与。
- `parseModelRef` / `resolveModel` 的 env 解析逻辑保留给首启搬家用，之后不在热路径上。

## 首启搬家

启动时若 `ai_model_settings` 与 `provider_keys` 都为空：

1. 读四个 `AI_*_MODEL` 环境变量，能解析的写入 `ai_model_settings`（含 `:level` 后缀转 thinkingLevel）。
2. 对导入的 role 引用到的 provider，用 pi-ai 的 `getEnvApiKey` 取 env 里的 key，加密写入 `provider_keys`。
3. 解析失败的项跳过并记日志，不阻塞启动。

只在全空时执行，天然幂等；之后 `.env` 里这些行删不删都无所谓。

## 前端设置页

- 路由 `/settings`，顶栏齿轮图标入口（现有轻量 router 加一条）。
- 复用 `ui/` 现有组件（Card / Select / Input / Button / Badge），不引新依赖。
- 交互即改即存：每个控件变更立刻 PUT，行内出保存状态；不做整页保存按钮。
- 组件拆分：`SettingsPage`（壳）+ `ProviderKeysCard` + `RoleModelsCard`，各自独立文件。

**卡片一：Provider 与 API key**

- 已配置 provider 一览：名字、掩码 key、更新时间、「更新」「删除」按钮。
- 「添加 provider」下拉（catalog 数据）+ key 输入框。
- `openai-codex` 显示徽标「本机 codex 登录，免 key」，无输入框。

**卡片二：模型分配**（四行）

- 每行：用途名（盘中快评 / 升级分析 / 深度研究 / 追问）→ provider 下拉 → 模型下拉（随 provider 联动）→ 思考深度下拉（默认「模型默认」）→ 「停用」开关 → 「测试」按钮（行内转圈后 ✓ 或错误原文）。
- 选中 provider 未配 key：行内黄字「该 provider 未配 key」。
- `chat` 未配置：灰字「未设置，回退用升级分析的模型」。
- 模型已不在目录：黄字提醒改选。

## 错误处理

- 解密失败（密钥文件丢失/密文损坏）→ 该 provider 视为未配 key，日志记一次。
- 模型从目录消失 → 该层自动停用，`GET /api/settings/ai` 标 `stale`，界面黄字。
- 写入校验失败 → 400 带原因，前端行内红字。
- 改模型时有对话进行中 → 当前轮用旧模型跑完，下一轮自动用新的（`aiConfig()` 现取现用的天然效果）。

## 测试

`cd app && pnpm test`（vitest，server 侧）：

- 加密模块：加解密往返、密文篡改必须报错、`v1:` 格式解析、密钥文件缺失时重新生成。
- settingsStore：增删改查 + 缓存刷新 + `chat` 回退 `analyst` 语义 + stale 模型返回 null。
- 首启搬家：从 env 导入（含 `:level` 后缀）、表非空时跳过、解析失败跳过。
- 路由（fastify inject）：校验拒绝、**任何响应不含明文 key**（专门断言）、catalog 形状与 key 状态、test 接口成功/失败两路（注入假的 pi-ai 调用）。
- 现有依赖 `aiConfig()` 读 env 的测试改为注入 store。

手动验收：起 server 走一遍设置页全流程（加 key → 分配模型 → 测试按钮 → 发一条追问确认生效）。

## 云服务演进备忘（不在本期范围）

若日后把这套服务对外提供，需要动的大头：

1. **账号与多租户**：登录体系、所有表加租户隔离、接口鉴权（现状是单人 localhost 裸奔）。
2. **模型 key 商业模式**：用户自带 key（本期加密方案直接演进，主密钥迁云端密钥管理服务，`v1:` 前缀即为此留）vs 平台代付按量计费（`ai_usage` 表已按次记 token 与成本，是计费/配额的地基）。
3. **数据层搬家**：SQLite + 磁盘文件 + 进程内实时推送 → Postgres + 对象存储 + 共享消息通道。
4. **AI agent 圈养**：深研 agent 现在能写仓库文件，云上必须沙箱化、限工具、防提示注入。
5. **行情授权与合规**：长桥个人账户数据对外展示属再分发，需商用行情授权或每用户自连券商；AI 投资分析对外提供有投资建议边界/牌照问题。

对本期设计的唯一约束：**新代码不再随手读 `process.env` 拿业务配置，一律走 settingsStore**——这是为多租户留的缝。
