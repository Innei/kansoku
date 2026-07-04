# 图表应用（app/）

本地图表应用，取代了原来嵌在 Python 字符串里的 HTML 模板渲染。pnpm workspace，三个包：

- `shared/` — 跨包类型定义（`ChartDoc` / `IntradayBuilt` / `SepaBuilt` / `CockpitFlow` / 等）与时间工具函数，server 和 web 共同引用。
- `server/` — Fastify + TypeScript。调 longbridge CLI 拉数据、算指标、提供 REST API 和 SSE 实时流，并以 middleware mode 内嵌 Vite dev server 直接托管前端源码（无打包环节）。
- `web/` — Vite + React + TypeScript。五种渲染组件 + 个股仪表盘。

## 启动

```bash
pnpm install        # 首次（从 workspace root）
pnpm start          # http://localhost:5199
```

单进程：server 内嵌 Vite dev server，前端改动即时热更新，不需要 build。改 server 代码用 `pnpm dev`（tsx watch，后端文件变了自动重启，Vite 随进程一起重启）。

## 页面路由

| 路由 | 功能 |
|---|---|
| `#/` | 图表列表页 —— 按类型过滤、按日期搜索、查看元数据与 stale 状态 |
| `#/charts/:id` | 单图详情页 —— 根据 `type`（flow / cohort / sepa / intraday）加载对应渲染组件，右侧显示侧边栏（技术指标、新闻、持仓、context） |
| `#/symbol/:sym` | 个股仪表盘（Cockpit）—— 四个标签页：环境对照、资金流、实时持仓、历史分析 |

## REST API

### 图表 CRUD

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/charts` | 列举图表。支持参数 `?type=sepa` / `?symbol=NVDA.US` / `?limit=20` / `?stale=true` |
| `POST` | `/api/charts` | 创建图表。body: `{type, symbol, ...}` → 返回 `{id, url, type, title, technicals?}` |
| `GET` | `/api/charts/:id` | 加载单份图表完整文档 |
| `PATCH` | `/api/charts/:id` | 更新图表。prediction 字段用 `{prediction: {...}}` 补充，`{refresh: true}` 触发数据重拉 |
| `DELETE` | `/api/charts/:id` | 删除图表 |
| `GET` | `/api/charts/:id/built` | 以更大 `?count=` 重新拉历史 K 线并重算指标（仅 intraday），不改落盘文档 |

### 个股数据

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/symbols/:sym/flow` | 当日资金流曲线（累计净流入） + 大/中/小单分布 |
| `GET` | `/api/symbols/:sym/latest` | 最新的 intraday 分析文档 + 持仓对照 + 目标/止损距离 |
| `GET` | `/api/symbols/:sym/positions` | 长桥实时持仓快照 |
| `GET` | `/api/symbols/:sym/analysis` | 历史 intraday 分析列表 + 结果追踪（到目标/到止损/进行中） |

### 实时流（SSE）

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/stream/quotes?extra=SYM1,SYM2` | 行情快照流。标的 = 长桥 watchlist ∪ 持仓 ∪ extra 参数，10 秒一轮，自动识别盘前/盘后/隔夜时段 |
| `GET` | `/api/stream/charts/:id?count=N` | 图表数据流。flow / intraday 图被打开时每 60 秒重拉数据、重算指标、推新数据（sepa 是收盘级研判工具，不参与实时）。数据指纹去重，连续 5 次失败退避到 5 分钟并亮黄点 |

**SSE 协议**：`event: message` + `data: {ok: true, data: {...}}`；每 15 秒 `event: ping` 保活。前端收到后原地更新，不重置缩放。

## 图表类型

四种，统一走 `POST /api/charts` 创建：

| type | 渲染库 | 内容 |
|---|---|---|
| `flow` | Recharts | 单标的资金流累计曲线（日内逐 tick 净流入） |
| `cohort` | Recharts | 跨标的 signed-bar 对比（各标的净流入/流出） |
| `sepa` | TradingView Lightweight Charts | SEPA 策略仪表盘——52 周高低、三均线（50/150/200）、RS 曲线（21/63/126 天）、成交分布、支撑/阻力区、入场计划，附带侧边栏：趋势模板 8 条检查、阶段判断、持仓对照、相关新闻 |
| `intraday` | TradingView Lightweight Charts | 短线多周期预测面板——5 分钟 / 15 分钟 / 1 小时三周期 K 线 + MACD + 均线，附带侧边栏：技术指标摘要（含结构信号）、入场计划、三情景推演、新闻、市场 context |

## 个体仪表盘（Cockpit）

访问 `http://localhost:5199/#/symbol/NVDA.US` 进入个股追踪面板，四个标签页：

- **环境（Environment）**：多头寸 vs SMH / QQQ 基准的归一化走势对照，持仓快照（成本、盈亏、目标/止损距离）
- **资金流（Flow）**：日内资金流曲线 + 大/中/小单分布柱状图，实时刷新
- **持仓（Position）**：从长桥拉取的该标的实时头寸详情
- **历史分析（History）**：过往 intraday 分析的完整列表，每条显示创建时间、方向判断（多/空/中性）、锚点价、结果追踪（✅ 到目标 / ⛔ 到止损 / ⏳ 进行中）和累计盈亏百分比，点击可回看对应图表

## intraday 面板的自动标注

不依赖 `prediction`，每次渲染都由 server 自动检测并画上（tooltip 带含义解释）：

- **MACD 结构信号**：每个 DIF/DEA 交叉按零轴位置分类（零上/零下金叉、零上/零下死叉），识别结构组合——二次金叉（零下双金叉且低点抬高 = 底部确认）、空中加油（零上二次金叉 = 强势延续）、二次死叉、DIF 上穿/下穿零轴（最新 1-2 根标 `?` 待确认）、零轴缠绕检测（震荡市警示）。
- **1-2-3 形态**：看涨/看跌 1-2-3 反转形态检测，区分 forming / confirmed 状态、止损位与突破触发价。
- **背离与背驰**：顶/底背离（价格 vs MACD 动能）和顶/底背驰（推动力衰减），均以带时间戳的线段在主图与 MACD 图之间交叉标注。
- **14 种经典 K 线形态**：单根（锤子线/上吊线/倒锤子/射击之星）、双根（看涨/看跌吞没、乌云盖顶、刺透、看涨/看跌孕线）、三根（启明星/黄昏星/红三兵/三只乌鸦）。带趋势背景过滤和实体大小过滤，同一根只标最强的一个。
- **时段覆盖层**：盘前/盘后浅蓝、夜盘深蓝的整高背景（主图与 MACD 副图同步），正常盘 = 09:30-16:00 ET，纽约时区实算，夏令时自动正确。
- **交互**：主图与 MACD 副图之间有拖拽分隔条（MACD 高度 100-340px，记忆在浏览器本地）；成交量柱半透明且与 K 线纵向分区，互不遮挡。

## AI 实时分析

驾驶舱（Cockpit）在盘中会自动跑一套 AI 分析，产物和你手动写的日内多周期结论（`intraday-signal`）同一格式，直接落进点评流。分两层：

- **点评员（commentator）**：轻量、频繁。server 每 60 秒扫一遍当天有 intraday 分析的标的，检测到触发信号（MACD 交叉、突破关键价位、资金流翻向、放量）或每 5 分钟心跳一次，就拿实时快照（报价 + 5 分钟 K 线 MACD + 资金流 + 已归档预测）让点评员写一两句中文白话点评。判断和已归档预测明显相反、或价格触及止损/目标时，会升级（escalate）。
- **分析员（analyst）**：重量、少跑。被点评员升级触发（同一标的 30 分钟冷却）时才启动，做完整的多周期重估，最后落一张新的 intraday 图并写点评。

两层都只在正常盘时段（09:30–16:00 ET）运行。

**环境变量**（模型串格式 `provider/id`，如 `anthropic/claude-haiku-4-5`）：

- `AI_COMMENT_MODEL` — 点评员用的模型。缺失则整个点评层停用，server 照常启动。
- `AI_ANALYST_MODEL` — 分析员用的模型。缺失则升级时不跑分析员。

**点评存哪**：`journal/charts/data/comments/<SYMBOL>-YYYY-MM-DD.json`（跟 journal 一起被 gitignore），SSE 实时推给打开的驾驶舱页面。

**冒烟脚本**（真调模型、真拉行情，会往当天点评文件里写真实点评）：

```bash
pnpm -C app/server exec tsx scripts/ai-smoke.ts MRVL.US            # 只跑点评员
pnpm -C app/server exec tsx scripts/ai-smoke.ts MRVL.US --analyst  # 再跑一遍分析员（会落新图）
```

脚本自动读仓库根目录 `.env` 里的模型配置，打印解析到的模型、跑对应层、打印落盘的点评（分析员那趟还打印新图 chartId）。模型环境变量缺失时报错并非零退出。不进 CI。

## 数据存哪

- 每张图一个 JSON：`journal/charts/data/YYYY-MM-DD-<slug>.json`（带 `schema_version`，跟着 journal 一起被 gitignore）。前端永远用最新代码渲染旧数据，改组件不影响历史图表。
- 旧的单文件 HTML 存档还在 `journal/charts/*.html`，server 在 `/legacy/` 下原样托管。
- **实时数据不落盘**：`journal/charts/data/` 里的文档永远是"研判那一刻的快照"，只有 POST / PATCH 才写盘。

## 测试

从 Python 迁移过来的计算逻辑由金标测试锁定——用原 Python 实现对真实行情数据算出的结果做基准，TS 版必须逐数对上（误差 < 1e-8）：

```bash
pnpm test           # vitest（server 包）
pnpm typecheck      # 两个包的 tsc
```

基准数据在 `server/test/fixtures/`。改指标算法前先想清楚：测试挂了说明和 Python 版行为不一致，要么是 bug，要么就该同步更新基准并在提交信息里说明。

## 后续规划

多图对比、交互标注、日志浏览。
