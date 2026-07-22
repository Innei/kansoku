# 均线可配置 + K 线周期可扩展 + 控制条重排

日期：2026-07-23
范围：intraday 图表前端（`apps/web/src/features/charts/intraday/`）、cockpit 顶栏（`apps/web/src/features/cockpit/`）、`packages/core` 的 intraday 构建拆分与一个新增的看图档接口。SEPA / flow 面板不在本次范围内。

## 背景与问题

两件事现在都是写死的，用户改不了：

1. **均线**。周期在服务端算好写进图表存档（`packages/core/src/analysis/intraday/timeframe.ts:93`），默认 `[9, 21, 55]`（`intraday/constants.ts:16`）。构建层其实已经支持传 `ema_periods`（`orchestrator.ts:50`，允许 2–250、最多 4 条），但没有任何界面能设置它，前端只有一个「EMA 均线」总开关。
2. **K 线周期**。`TimeframeKey = 'm5' | 'm15' | 'h1'` 是写死的联合类型（`packages/shared/types.ts:213`），构建时强制三档齐全（`orchestrator.ts:115`）。长桥本身支持 1m/5m/15m/30m/1h/日/周/月/年（`marketdata/longbridge.ts:65`），数据源不是瓶颈。

同时，周期档位一旦放开，现在那个挤在顶栏标题旁边的切换器就摆不下了，所以顺带做一次顶部控件重排。

## 总体设计：分析档与看图档

核心是把「周期」拆成两类，边界清晰：

| | 分析档 5m / 15m / 1h | 看图档 1m / 30m / 日 / 周 / 月 |
| --- | --- | --- |
| 写进存档、冻结在分析时刻 | 是 | 否 |
| 进 AI 多周期判断、预测锚点 | 是 | 否 |
| MACD / 缠论 / FVG / 形态标注 | 有 | 有，现算不存 |
| 盘中实时 | 逐笔合成（现状不变） | 报价盖最后一根 + 定时重取 |
| 用户能否移除 | 否 | 随时勾选 |

这样 `TimeframeKey` 及其下游（缠论、标注、预测锚点、存档结构）一律不动，改动被关在两处：前端多一套看图档的取数与渲染，服务端多一个无状态接口。

均线走的是另一条更轻的路：**纯显示层，前端自己算**。服务端那组 EMA 继续服务 AI 和形态打分（`timeframe.ts:130` 的 `enrichCandlePatterns` 要吃 `emaArrs`），一行不改。这样存档的「分析时刻冻结」语义不被改写，形态打分也不会因为用户换了均线周期而漂移。

## 一、均线可配置（纯前端）

### 配置模型与存储

新增 `apps/web/src/features/charts/intraday/useMaLines.ts`，写法对齐现有的 `useIndicatorToggles.ts`：

- localStorage key：`intraday-ma-lines`
- 每条线：`{ id: string; period: number; color: string; visible: boolean }`
- 默认三条：9 / 21 / 55，颜色取现有 `EMA_COLORS`（`useIntradayCharts.ts:46`）的前三个
- 上限 5 条；周期收在 2–500（前端自己算，不受服务端 `sanitizeEmaPeriods` 那个 250 上限约束）
- 全局一份：所有图、所有周期共用，不按 symbol、不按周期分别存

读取时做校验：非整数、超范围、重复周期、超过 5 条一律丢弃并回落到默认值。

### 计算与渲染

计算直接复用 core 的实现：`import { ema, lineData } from '@kansoku/core/analysis/indicators'`。core 的 exports 是 `./*` 直映射源码（`packages/core/package.json:6`），`apps/web` 本来就依赖 `@kansoku/core`，而 `indicators.ts` 只引用 shared 的类型和 `ClientError`，是纯计算模块，能安全打包进前端。不另抄一份实现，避免两处漂移。

输入是 `built.timeframes[tf].candles` 的收盘价序列——这份数据前端本来就有，所以改配置不需要请求服务端，图上立刻重画，翻历史存档时同样能改。

渲染层改动在 `useIntradayCharts.ts:224`：现在按 `built.timeframes.m5.emas.length` 一次性建 line series，改成**固定预建 5 条**，按配置逐条设置颜色、数据、可见性，空位喂空数组。这样避免配置增删时动态 add/removeSeries 的生命周期问题。

图例（`IntradayDashboard.tsx:227`）改成读同一份配置和前端算出的最新值，不再读 `built.sidebar.technicals[tf].emas`。

### 服务端保持不动的部分

`ema_periods`、`DEFAULT_EMA_PERIODS`、`sanitizeEmaPeriods`、`built...emas`、`technicals[tf].emas` 全部原样保留并继续下发——AI 提示词、形态打分、meta 都在用。前端只是不再拿它画线。

均线面板底部写明这件事：「只影响图上画的线，AI 判断和形态打分仍走固定的 9 / 21 / 55」，避免用户误以为改了均线就改了分析口径。

## 二、K 线周期可扩展

### 类型与取数接口

新增 `ViewPeriod = '1m' | '30m' | 'day' | 'week' | 'month'`，**不并进 `TimeframeKey`**。前端周期按钮排的值域是 `TimeframeKey | ViewPeriod`。

服务端加一个无状态接口：

```
GET /api/charts/view-timeframe?symbol=&period=&count=&as_of=
```

返回一份 `IntradayTfData`，结构与分析档完全一致（candles / volumes / macd / 标注 / fvgZones / chanStructure / offSession），前端渲染路径因此可以完全复用。前端走 typed client，方法名 `client.charts.viewTimeframe`，与现有的 `client.charts.get` / `client.charts.built` 一致。

实现上要先做一次拆分：`buildIntraday` 里「CoercedTimeframe → IntradayTfData」那段循环（`orchestrator.ts:171-271`）抽成独立函数，供 `buildIntraday` 和新接口共用。看图档没有 AI 标注、预测锚点和入场计划，对应入参传空。

配套的小放宽：

- `coerceIntradayTimeframe` 的 `key` 参数类型从 `TimeframeKey` 放宽成 `string`
- `VWAP_TIMEFRAMES`（`constants.ts:74`）加入 `1m`；日线以上本来就不该有日内 VWAP
- 服务端对 `(symbol, period, count)` 做 5 秒短 TTL 缓存，避免多窗口同时切换重复拉取

### 翻历史存档时的截断

长桥的 kline 只能按根数取，不支持日期段（`longbridge.ts:190` 起，参数只有 `--period` / `--count` / `--session`）。所以历史存档上切看图档时，服务端拉 `count` 根后按 `time <= as_of` 过滤。

日线周线肯定覆盖得到；1m 档 1000 根只有约 2.5 个交易日，翻很旧的存档会过滤成空。这种情况明确报错，前端提示「该周期取不到分析时刻的数据」，**不允许拿最新的走势冒充分析时刻的图**。

### 实时策略

看图档不进存档，也就不走 chart 那条 WS 通道（那条通道推的是整份 built）。统一用两段式：

1. **报价盖最后一根**：前端本来就订着实时报价（cockpit 的 `liveQuote`、popout 的 `useLiveQuote`，`PopoutChartWindow.tsx:12`）。每次报价推送，把最后一根 bar 的 close 换成最新价，high/low 取 max/min。
2. **定时重取**：按 `pollIntervalMs`（`realtime/pushFallback.ts:21`）的档位——盘中 15s、盘前盘后 30s、夜盘 5min——重取一次完整数据，纠正 high/low、成交量并刷新标注。

这条路 `candleAggregator` 和 WS 协议一行都不用改。代价是 1m 档的新 bar 最晚 15 秒才出现，而 bar 本身一分钟一根，可以接受。

日线以上不需要按交易日分桶的合成逻辑（那要处理交易日边界、盘前盘后口径、周月边界的成交量拼接），这次全部避开。

### 存储

勾选哪些档位存 localStorage（`intraday-timeframes`，全局），默认 `['m5', 'm15', 'h1']`，即默认行为与现在完全一致。勾上的按时间从短到长自动排进按钮排。

## 三、控制条重排

### 布局

`.detail-topbar`（`styles.css:486`）从 flex 改成 `grid-template-columns: 1fr var(--sidebar-w)`，把 340px 抽成 CSS 变量，`.layout`（`styles.css:590`）改用同一个变量。左格加 `border-right`，与 `.charts-col` 的 border-right（`styles.css:596`）连成一条通到底的竖线，于是这一行天然分成「图表的一段」和「面板的一段」。

- **左格**：← 列表 · symbol · 数据延迟提示点 · 周期按钮排 + 齿轮 · 分析时间轴 · 加载后续 K 线（有才显示）· 右端顶着 `均线 N ▾` `图层 N/N ▾`
- **右格**：「有新分析」badge · AI 提醒图标 · 弹出 · 实时报价

`doc.title`（如「SMH 短线多周期」）从顶栏移除，只留 symbol——左格要塞下周期排、时间轴和两个下拉，标题是这一行里信息量最低的一项。窗口标题和浏览器 tab 继续用它。

### 两个下拉面板

**均线**（点「均线 N」）：每行是圆点开关 + 颜色块 + 周期数字框 + 当前值 + 删除；底部「＋ 添加均线」（满 5 条禁用）；面板底部是那句口径说明。

**周期设置**（点周期排后面的齿轮，不是加号）：长桥九档的勾选清单，5m / 15m / 1h 标注「分析档」且不可取消——存档和 AI 的多周期判断绑在它们身上。

`.layer-panel`（`styles.css:1223`）不再绝对定位浮在 K 线上，改挂到控制条做下拉，面板内部结构不动。图层里现有的「EMA 均线」开关保留，当均线总开关用。`chart-legend` 继续留在图上左上角浮着（它要跟着最新价实时变），但内容改由前端均线配置驱动。

### AI 提醒

`alert-badge`（`styles.css:1588`，现在 `max-width: 320px` 的长条，`SymbolCockpit.tsx:279`）缩成图标按钮：悬停出完整文本，点击进 AI 面板，level 是 `alert` 时变红并呼吸。这是腾出顶栏空间的关键一步。

### 涉及文件

- `SymbolCockpit.tsx:243` 与 `PreviewCockpit.tsx:120`：两个页面共用同一套顶栏结构
- `CockpitSkeleton`：同步换成同一套 grid，否则加载时布局会跳
- `PopoutChartWindow.tsx`：没有两栏结构，在 `.popout-header` 渲染一条只有左段的同款控制条（周期 + 均线 + 图层，不含时间轴和报价）
- 控制条左段抽成共享组件，上述三处各渲染一份

## 实施顺序

三块改动彼此不依赖，建议分三步落地，每步单独可验证：

1. **控制条重排**（纯前端布局）——先做，因为它给后面两块腾出入口位置，而且不改任何数据链路，出问题好回退。
2. **均线可配置**（纯前端）——只依赖第 1 步提供的下拉入口。
3. **看图档**（前后端）——改动面最大，包含 `orchestrator.ts` 的函数拆分和新接口，放在最后。

## 不做的事

- **不做 SMA**，只做 EMA。等确有需要再加类型选择。
- **不按周期分别配置均线**（5m 一组、1h 另一组）。全局一份，将来要加「某周期覆盖」是在现有结构上追加，反过来则要拆数据结构。
- **不做每张图单独的均线配置**。
- **不动 `TimeframeKey`**，不把看图档写进存档，不让它参与 AI 判断。
- **不改 `candleAggregator` 和 WS 协议**。
- **分析档三档不可移除**。

## 测试

- `useMaLines`：存取、非法周期、超上限、重复周期、损坏的 localStorage 内容回落默认值
- 前端算出的 EMA 与 core 的 `ema()` 对拍一致
- `toTfData` 抽出后 `packages/core/test/intraday.test.ts` 原样通过（回归）
- view-timeframe 接口：period 白名单拒绝非法值、`as_of` 截断正确、过滤成空时报错而不是返回最新数据
- `IntradayDashboard.test.tsx:15` 现在 mock 了 `EMA_COLORS`，跟着改
- 顶栏与图表区的竖线对齐依赖同一个 CSS 变量，加一条断言防止将来两处各改各的

## 影响面与风险

- **显示与分析口径不一致**：用户把均线改成 5/10 后，图上画的和 AI 当时判断用的不是同一组。这是选择纯显示层的必然结果，靠面板里那句说明兜住。
- **看图档没有 AI 标注**：切到 30m 看不到 AI 画的锚点和入场计划，因为那些绑在分析档上。按钮上的「分析档」标记要能让人看出区别。
- **1m 档翻旧存档取不到数据**：已明确为报错，不静默降级。
- **竖线错位**：顶栏 grid 与 `.layout` 的列宽必须同源，否则两条线对不上，这是本次布局改动最容易回归的点。
