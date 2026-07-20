# 单图 Overlay 架构:构建期组合取代运行时 Edition ABI

日期:2026-07-20
状态:已批准,待实施
取代:codex/pro-overlay-poc 分支上的运行时 Edition ABI 方案(PR kansoku#50 / kansoku-pro#9,不合并,关闭)

## 0. 一句话

一次 vite 构建同时编译宿主与 pro(单模块图),pro 代码经 overlay 投影进图、被 chunk 路由隔离到 `__pro__/`,打包时只加密这个目录成 `pro.enc`;产物仍是单一 dmg,免费直接用、输 key 就地解锁;版本化 ABI 层整层不存在。

## 1. 需求与边界(已确认的决策)

| 决策点 | 结论 |
| --- | --- |
| 单产物 + key 就地解锁 + pro 代码加密出厂 | 保留,不妥协 |
| Pro 的 web UI | Electron 专属;生产浏览器 / standalone server 部署无 Pro UI |
| standalone server 生产形态 | 免费版即可,Pro 只随桌面 app 出厂;server 构建管线不动 |
| overlay 文件约定 | 两文件:默认 `foo.ts` + 覆盖 `foo.pro.ts`,不引入 `.oss.ts` 三件套 |
| 迁移策略 | C1:关闭两个 PR,两仓各从 main 开新分支,移植方向不变的部分,ABI 层不搬 |

## 2. Overlay 组合机制(从 PR 分支原样移植)

- `apps/pro/overlays/<跟公开仓一致的镜像路径>/foo.pro.ts` 存放覆盖实现;`packages/build-overlay/scripts/sync.mjs` 在公开仓对应位置建同名软链接(gitignore,不进公开仓历史),状态记 `.kansoku-overlay-links.json`。
- 类型检查:各包 `tsconfig.pro.json` 用 `moduleSuffixes: [".pro", ""]`。
- 构建:`proOverlayPlugin` 在 resolve 时优先选 `.pro` 文件;社区检出没有 `apps/pro`,插件不启用,默认文件生效。
- 五条 ESLint 红线原样移植:`no-explicit-pro-import`、`no-apps-pro-import`、`no-pro-only-resolution`、`no-self-default-import`、`overlay-manifest-consistency`(另有 `no-escaping-import`)。
- Pro 专属文件(公开仓无默认兄弟)必须登记 `apps/pro/overlay.private-only.json`。

## 3. 公共代码到 pro 的唯一运行时边界

每个需要 pro 组合的宿主各有一个**组合点模块**(如 `apps/desktop/src/edition/pro.ts`、`apps/web/src/edition/pro.ts`):

- 默认文件:返回"无 pro"(空组合 / null)。
- 覆盖文件 `pro.pro.ts`:返回真实 pro 组合(注册路由 / IPC / realtime 频道 / AI 扩展——直接 import 宿主的注册器,普通同仓 TypeScript,无 host 对象传递)。
- 宿主侧对组合点做**带 catch 的动态 import**:chunk 缺失、解密失败、错钥,统统 catch 进免费路径。免费实现全部是公开代码、静态可达。

同一产物由此覆盖四态:社区构建(默认文件,静态无 pro)/ pro 构建未激活(`__pro__` chunk 加载失败 → 免费)/ 错钥(解密失败 → 免费)/ 已激活(pro 组合生效)。

## 4. 构建与加密(desktop 管线)

复活 main 的 `vite.main.config.ts` 单图机制(`4410cd7`)并推广到 web 构建:

- **chunk 路由**:模块 realpath 落在 `apps/pro/` 下(overlay 软链接经 vite 默认 realpath 解析后即是)→ 该 chunk 输出到 `__pro__/`。desktop 主进程与 web 渲染两条构建各自执行。
- **`proLeakGuard` 两条构建期断言**(build-fatal):pro 模块不得出现在 `__pro__` 之外的 chunk;`__pro__` 之外的 chunk 不得 import `__pro__` chunk。
- **`stagePro`**:把 node 侧 `dist-main/__pro__` 与 web 侧 `dist/__pro__` 合并交给 `packEnc`,加密成一个 `pro.enc`(KPRO1 字节格式不变;bundle.json 去掉 ABI 字段,保留 buildId / publicCommit / proCommit 仅供诊断),随后删除全部明文 `__pro__`。
- **泄漏闸门**:pro 入口链埋 canary 常量;afterPack 对 raw asar 字节扫 canary + 现有 source-map / 杂散 pro 条目扫描,全部保留。
- 社区构建:`KANSOKU_FORCE_FREE=1` 或 `apps/pro` 缺席 → 不产 `__pro__`,stagePro 直接放行;若产了反而报错(陈旧构建)。

## 5. 运行时加载

- **Node 侧**:复用 main 的 `packages/core/src/pro/loader.ts` 虚拟根机制——解密后将文件映射回 `dist-main/__pro__` 原位,pro chunk 的相对 import(`../chunk-x.mjs`)落到真实 dist 文件上,与宿主共享一个模块图(React 无关;tsuki 装饰器元数据、getDb 等单例天然共享)。
- **Web 侧(Electron 专属)**:`app://` 协议 handler 增加 fallthrough——请求路径命中解密文件集合(web `__pro__` 部分)时从内存供给,未命中走 dist 静态文件。同源,pro chunk 对共享 chunk 的相对 import 天然解析;**不需要** `pro-asset://` 独立协议、importmap React 单例、WebEditionHost。pro 路由表本身在 pro chunk 里,激活成功才 import 得到——未激活的产物路由图中 pro 页面完全不存在。
- **License / key**:licenseState 持 key、激活 watch、relaunch 提示,全部原样保留;错钥安全降级语义不变。

## 6. Dev 工作流

- 桌面:`pnpm dev:desktop` —— vite watch 输出明文 `__pro__` chunk,kernel 以 dev 路径直接加载(main 的既有 dev 语义),无加密、无协议。
- 浏览器 `pnpm dev`:源码图 + overlay resolver,pro 功能照常可用(dev 机器有 `apps/pro`);这与"生产浏览器无 Pro"不矛盾——那是产物形态的约束,不是 dev 的。
- 实施期需逐一验证 dev 侧解析器对 `moduleSuffixes` 的支持:web dev 走 vite(插件覆盖 resolve,无疑问);server dev 走 tsx,若其解析不认 `moduleSuffixes`,以 overlay 插件同逻辑的 loader hook 兜底,方案在实施计划里定。
- **删除不移植**:dist-dev 构建、`loadEditionFromDevDist()`、`editionSource` 分支、dev boot 的 edition 协议路径。

## 7. 迁移策略(C1)

1. 关闭 PR kansoku#50 与 kansoku-pro#9;两分支保留作移植素材,不再推进。
2. 公开仓、私有仓各从自己的 `origin/main` 开新分支。
3. **移植清单**(需适配,非干净 cherry-pick):
   - `packages/build-overlay` 全套(sync / 插件 / ESLint 规则 / private-only 清单机制);POC 目录退役——真实管线即回归测试。
   - packEnc 的 bundle-manifest / canary 增强(去 ABI 字段)。
   - **pro 页面抽离**:PR 里页面搬进了 `apps/pro/src/web` 并按 WebEditionHost 挂载;新架构下改放 `apps/pro/overlays/` 镜像路径(如 `apps/web/src/pages/research/…` 的 `.pro.tsx`),按普通 lazy route 接线。这是移植中最大的一块适配工作。
   - LicensePanel 等 UI 件、免费降级 / feature gate 相关的 open-core 侧改动(以 main 已有状态为基线甄别)。
4. **不搬**:editionLoader 的协议层(`loadEdition` 的 ABI 校验、EditionEntry)、`webEditionHost`、edition host 对象体系、`abi:gate`、dist-dev 协议、pro 仓独立构建管线(`vite.config.node.ts` 等——pro 不再自己出包)。
5. 工作区(kansoku-workspace)在新组合验证后再做 gitlink 固化。

## 8. 验收标准

1. 社区构建(公开检出、无 `apps/pro`)install / build / run 全通,产物零私有痕迹(现有扫描口径)。
2. pro 构建 `proLeakGuard` 绿;afterPack canary + asar 扫描绿。
3. 四态激活矩阵:已激活(pro 路由 / IPC / 频道全量)、未激活(免费,pro 路由不存在)、错钥 / 篡改(安全降级免费)、社区(静态免费),各态行为逐一验证。
4. desktop / web / core / server 测试套件全绿;typecheck + typecheck:pro + lint 干净。
5. 真机 dmg 冒烟:未激活 → 激活 → relaunch → Pro 全功能;单 dmg 双形态确认。
6. 全仓 grep:ABI 层符号(EditionEntry / abiVersion / WebEditionHost / loadEditionFromDevDist / pro-asset)归零。
