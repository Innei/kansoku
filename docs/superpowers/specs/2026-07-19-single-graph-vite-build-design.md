# 桌面端单图构建：tsdown → Vite，pro 并入同一张模块图

日期：2026-07-19
状态：已批准

## 背景与动机

桌面端目前是两条独立的 tsdown 管线：desktop 构建 `dist-main`/`dist-preload`，pro 仓库自己构建 `dist/` 后由 `packEnc` 加密成 `pro.enc`。两次构建 = 两张模块图，任何需要「kernel 和 pro 共享单实例」的包（`@tsuki-hono/*` 的 decorator metadata 用模块局部 `Symbol` 做 key，两份副本互不可读；`hono` 作为 tsuki 的 peer 也一并牵连）都只能 external 到 asar 的 node_modules，靠运行时从同一份文件解析来保证单实例。

这带来一个长期陷阱：`package.json` 的 `dependencies` 档位与「运行时外部依赖白名单」被隐式绑定，进错档位就是打包后 `ERR_MODULE_NOT_FOUND` 或更隐蔽的双实例故障（已实证：pro 路由映射失效）。

本设计把 main 和 pro 并进**同一次 Vite 构建的同一张图**，单实例由构建保证，external 白名单缩到 native 模块，整类问题消失。

## 方案概览

- desktop 用 Vite 构建，两个构建目标：
  - **main 图**：`vite.main.config.ts`，platform node、ESM、输出 `dist-main/`。entry `src/main.ts`；当 `apps/pro` 存在时追加第二个 entry `../pro/src/index.ts`。
  - **preload**：CJS、输出 `dist-preload/`（独立小构建，只 external `electron`）。
- main 图的 external 只剩：`electron`、`better-sqlite3`、`electron-sparkle-updater`（native/宿主提供）。tsuki、hono、electron-context-menu、electron-ipc-decorator、partial-json、zod、tsyringe 等全部 bundle 进图。
- desktop `dependencies` 缩到 `better-sqlite3` + `electron-sparkle-updater`；其余全为 devDependencies。asar 的 node_modules 只剩这两棵 native 树。
- tsdown 从 desktop 移除；pro 仓库删除自己的构建管线。

## pro 代码的切分（默认 chunking + 文件名路由）

> 实施时修正：原设计用 `output.manualChunks` 定向分桶，实测 rolldown 的 manualChunks
> 兼容层会把被 pin 模块的**依赖也拖进组**（1300+ 共享模块被吞进 pro 桶，main 反向
> import 加密 chunk，打包后启动即 ERR_MODULE_NOT_FOUND）。弃用。

实际方案：不干预 chunking——默认规则已保证「只被 pro entry 可达的模块留在 pro 的
chunk、共享模块拆进公共 chunk」。只做**输出路径路由**：`entryFileNames` /
`chunkFileNames` 回调把「`moduleIds` 含 pro/src 模块，或 `facadeModuleId` 是 pro/src
模块（pro 内部动态 import 会产生无 moduleIds 的转发壳）」的 chunk 全部写到
`dist-main/__pro__/` 下。

- pro 与 main 共用的模块（tsuki、core、hono …）按「被 main entry 可达即公开」的天然规则留在 dist-main 的共享 chunk 里——这些本来就是公开代码。
- 只被 pro 可达的个别 core 模块会落进 `__pro__`（本就公开的代码被加密，无害）。

## 加密与加载

- **enc 字节格式不变**（`KPRO1` + IV + authTag + gzip(JSON manifest)，被 core 的 golden fixture 钉死）。变的只是 manifest 里装哪些文件：从「pro 仓 dist 整目录」变成「desktop 构建产出的 `__pro__/` 目录」。`collectDistFiles` 原样复用。
- `stagePro.mjs` 新职责：调用 pro 仓的 packEnc 对 `dist-main/__pro__/` 加密 → `pro/pro.enc` 进 asar；随后把 `__pro__/` 从 dist-main 删除（明文私有代码绝不进包）。
- **encLoader 本体不改**。虚拟根从 `<appDir>/pro/__enc__` 移到 `<appDir>/dist-main/__pro__`：pro chunk 内 `../chunk-X.mjs` 形式的相对 import 不在虚拟 map 里，resolve hook 自然 fallthrough 到真实文件系统，命中 dist-main 的共享 chunk——同一张图闭合。
- `packages/core/src/pro/loader.ts` 调整虚拟根路径与明文入口路径（见 dev 节）。

## 泄露守卫（两层，缺一不可）

chunk 边界从此就是付费代码的泄露边界，必须有构建期硬门：

1. **构建内断言**（双向）：Vite 插件在 `generateBundle` 断言 (a) `__pro__/` 之外没有任何 chunk 的 modules 含 `apps/pro/src` 来源；(b) `__pro__/` 之外没有任何 chunk（静态或动态）import `__pro__/` 下的 chunk——(b) 正是 manualChunks 事故里被穿越的那条边。违反 → 构建失败并列出违规模块/边。
2. **打包后 canary 扫描**：pro 源码内置一个 canary 常量字符串（唯一、不可压缩消除，例如导出后被入口引用）。afterPack 解包扫描 asar 内全部明文 js，canary 出现 → 打包失败。

负向测试：故意把一个 pro 模块排除出 manualChunks 谓词，验证两层守卫分别报警。

## dev 模式（与 prod 同图）

- `dev.mjs`：tsdown watch 换成两个 `vite build --watch`（main 图 + preload），电子重启监听逻辑保留。
- dev 下不加密：`loadPro` 直接 import `dist-main/__pro__/index.mjs` 明文 chunk。
- 删除 tsx 运行时加载路径及其依赖（`__DESKTOP_DEV__` 的 tsx 分支、`predev` 的相关部分按需清理）。
- dev 与 prod 唯一差异 = pro chunk 是否加密；模块图、chunk 形态完全一致。
- 免费构建 / pro 缺席：main 图只有一个 entry，`__pro__/` 不产出，loadPro 找不到 pro.enc 与明文 chunk → free mode，与现状语义一致（`GET /api/capabilities` 报 `{pro:false}`）。

## pro 仓库变化（单独 commit 到 kansoku-pro）

- 删 `tsdown.config.ts`、`build` script、`dist/`。
- `release` script 改为：由 desktop 侧构建先行，packEnc 消费 `../desktop/dist-main/__pro__`。
- bench / vitest 继续 vite-node 直跑源码，不受影响。
- server host（vite-node 跑 core 源码 + 明文 pro slot）路径不变：loader 的源码入口分支保留。

## 兼容与风险

- **风险：chunk 边界漂移泄露付费代码** → 两层守卫把风险转化为构建失败。
- **风险：Vite 对 Electron main 的 node 平台输出配置**（builtin external、`import.meta` 处理）与 tsdown 有差异 → 迁移后跑完整 smoke：打包产物启动、kernel 自检 200、IPC 首调用、Sparkle updater 引用的 `electron-sparkle-updater/builder` 子路径导入。
- **CI**：desktop-release workflow 中 `KANSOKU_BUNDLE_KEY` 的注入点不变（packEnc 阶段）；构建命令名不变（`pnpm package` 内部替换）。
- 上一轮的「dependencies = 运行时白名单」契约注释随 tsdown 配置删除，契约本身在新世界退化为「只有 native 进 dependencies」，写进新 Vite 配置注释。

## 验证清单

1. 免费构建（无 apps/pro）：打包、启动、`/api/capabilities` → `{pro:false}`，无 ERR_MODULE_NOT_FOUND。
2. 付费构建：`packEnc --dev-random-key` 全链路——pro.enc 解密、虚拟根相对 import 命中共享 chunk、pro 路由全部映射、`{pro:true}`。
3. 守卫负向测试：破坏 manualChunks 谓词 → 构建失败；绕过构建断言 → afterPack canary 报警。
4. dev：`pnpm dev:desktop` 起得来，改 pro 源码触发 rebuild + 重启。
5. asar 体积对比（预期 node_modules 只剩 native 两棵树）。
6. pro 仓 `pnpm test` / bench 不回归。
