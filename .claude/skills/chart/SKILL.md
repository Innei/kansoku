---
name: chart
description: >
  Render financial charts to a self-contained HTML file. Four chart types:
  intraday capital-flow line (`flow`), OHLC candlestick with volume (`kline`),
  cross-symbol signed-bar comparison (`cohort`) — all ECharts via CDN — plus
  SEPA strategy dashboard (`sepa`) — TradingView Lightweight Charts with K-line,
  MA50/150/200 stack, RS vs SPY sub-plot, volume-ratio sub-plot, 8-condition
  trend-template scorecard, auto verdict (PASS / WATCH / BUY), event markers
  (climax top, MA50/200 break, earnings, 52w high), and optional position panel.
  Input formats match Longbridge CLI native output for flow/kline/cohort;
  `sepa` takes a structured `{symbol, name, as_of_date, kline[], spy_kline[],
  position?, context?}` object. Output: `journal/charts/YYYY-MM-DD-<slug>.html`.
  Triggers: 出图、生成图表、画 K 线、画资金流曲线、画对比图、SEPA 仪表盘、
  入场判断可视化、可视化、render chart, plot, visualise, sepa dashboard.
---

# chart

Generates self-contained HTML charts (ECharts via CDN) so the user can open
them in a browser instead of squinting at tables.

> **Response language**: match the user — 简体 / 繁體 / English.

## When to call

- After running `longbridge capital --flow` and the user wants a visual ⇒ `flow`
- After running `longbridge kline` for multi-day K-line review ⇒ `kline`
- After collecting cumulative net inflow across a cohort of symbols
  (e.g. storage vs Mag 7) ⇒ `cohort`
- After running `sepa-strategy` on a single name ⇒ `sepa` (auto-detect verdict,
  render dashboard, append link to the SEPA report)
- When inside `capital-rotation` / `market-session-tracker` / `stock-deep-dive`,
  call this as the LAST step and append a link to the produced HTML in the
  markdown journal entry.

Skip when the user only wants a single number or a tiny series — a Unicode
sparkline in the chat reply is faster.

## CLI

```bash
# All three modes read JSON from stdin OR from --data <path>
longbridge capital MU.US --flow --format json \
  | python3 .claude/skills/chart/scripts/render.py \
      --type flow \
      --title "MU 主力资金流 2026-06-25" \
      --subtitle "Source: Longbridge · 单位推断为千 USD · 仅供参考" \
      --open

longbridge kline NVDA.US --period day --count 30 --format json \
  | python3 .claude/skills/chart/scripts/render.py \
      --type kline --title "NVDA 30 日 K 线" --open

# Cohort takes [{symbol, value}] or [{label, value, group}]
echo '[{"symbol":"MU","value":-17087},{"symbol":"NVDA","value":-35728}]' \
  | python3 .claude/skills/chart/scripts/render.py \
      --type cohort --title "存储 vs Mag 7 主力净流" --open

# SEPA dashboard — input is a single JSON object (NOT array)
python3 .claude/skills/chart/scripts/render.py \
    --type sepa --data mrvl_sepa_input.json --open
```

Flags:

| Flag | Required | Meaning |
|---|---|---|
| `--type {flow,kline,cohort}` | yes (unless `--smoke`) | Chart kind |
| `--title <str>` | no | Chart title (used in HTML `<title>` and output slug) |
| `--subtitle <str>` | no | Source / units / disclaimer line under the title |
| `--data <path>` | no | JSON path; if omitted, reads stdin |
| `--out <path>` | no | Override output path; default `journal/charts/YYYY-MM-DD-<slug>.html` |
| `--open` | no | After write, open the file in the default browser (macOS `open`) |
| `--smoke` | no | Self-test: render synthetic cohort to `/tmp` and verify |
| `--help` | no | Standard argparse help |

## Input JSON contracts

| Type | Shape | Source |
|---|---|---|
| `flow` | `[{"time": ISO-8601, "inflow": str-or-num}, ...]` | `longbridge capital <SYM> --flow` |
| `kline` | `[{"time": ISO-8601, "open": ..., "high": ..., "low": ..., "close": ..., "volume": ...}, ...]` | `longbridge kline <SYM>` |
| `cohort` | `[{"symbol": str, "value": num}, ...]` or `[{"label": str, "value": num, "group"?: str}, ...]` | hand-rolled JSON from cohort net flows |
| `sepa` | **object** (not array) — see below | hand-assembled from `longbridge kline <SYM>` + `longbridge kline SPY.US` |

Numeric strings (Longbridge default) are accepted — `float(...)` cast happens in Python.

### `sepa` input object schema

```jsonc
{
  "symbol": "MRVL.US",                  // required
  "name": "Marvell Technology",         // required (used in sidebar header)
  "as_of_date": "2026-06-26",           // optional (defaults to last kline bar date)
  "kline": [ ...260 daily bars... ],    // required, ≥ 50 bars; same shape as `kline` type above
  "spy_kline": [ ...250 daily bars... ],// optional but recommended — enables RS subplot + condition 8
  "position": {                          // optional — renders the 持仓视角 panel
    "shares": 6,
    "cost": 303.64
  },
  "context": {                           // optional — all sub-fields are optional
    "earnings_dates": ["2026-05-29"],   // adds E markers on those bars
    "stage": "Stage 2 末期",            // shows in 阶段判断 panel
    "stage_note": "Stage 3 顶部嫌疑",
    "base_count": "3-4 (减半仓)",
    "pattern": "无可买（扩张振幅）",
    "verdict": {                         // OPTIONAL: override the auto verdict
      "tier": "watch",                   // pass / watch / buy
      "label": "👀 WATCH LIST",
      "color": "#ffc107",
      "reason": "..."
    },
    "entry_plan": {                      // OPTIONAL: renders 入场计划 sidebar card +
                                         // draws 5 price lines on the main chart
      "pivot": 260.00,                   // required: consolidation-range high (SEPA pivot)
      "stop": 241.80,                    // optional: default = pivot × 0.93 (-7%)
      "target1_pct": 8,                  // optional: default 8 (Phase 2: 卖一半 + 移至本钱)
      "target2_pct": 15,                 // optional: default 15 (Phase 3: 再卖 25% + 沿 20MA 跟踪)
      "note": "...",                     // optional: 一句话说明 (条件/风险/为什么这个 pivot)
      "hypothetical": true               // optional: 标注 "假设性" 徽章 (当 verdict 不是 buy 时)
    }
  }
}
```

**Entry-plan derived values (auto-computed):**

- `buy_zone_high` = `pivot × 1.05` (SEPA Step 6 — buy zone is pivot ~ pivot+5%)
- `target1` = `pivot × (1 + target1_pct/100)`
- `target2` = `pivot × (1 + target2_pct/100)`
- `R/R` = `(target2 − pivot) / (pivot − stop)` — based on T2, not T1, because T1 is the SEPA Phase-2 partial-exit (only half + move-to-breakeven), not the real profit target. SEPA requires R/R ≥ 2:1 (prefer ≥ 3:1); below 2:1 the card shows a red warning.

**Lines drawn on main chart when `entry_plan` is set:**

| Line | Color/style |
|---|---|
| `pivot` | green solid (buy entry) |
| `buy_zone_high` | green dashed |
| `stop` | red dashed |
| `target1` | light blue dashed |
| `target2` | dark blue dashed |

**Verdict auto-detection rules (when `context.verdict` is omitted):**

- Any trend-template Fail → `PASS` 🚫 (red)
- All 8 pass + price > MA50 by ≥ 25% → `WATCH LIST · Extended` 👀 (amber)
- All 8 pass + not extended → `WATCH LIST · No pattern detected` 👀 (amber, prompts manual pattern check)
- `STRONG BUY` ✅ is NOT auto-detected — caller must pass `context.verdict` after manually confirming a valid pattern + pivot ±5% buy zone.

**Markers auto-detected on the main K-line:**

| Event | Detection rule | Visual |
|---|---|---|
| Earnings | Date in `context.earnings_dates` | Blue circle below bar, label `E 财报` |
| Climax top | Volume ≥ 2.5 × 20MA + close < open + bar high = max of last 6 bars | Red down-arrow above bar |
| Drop below MA50 | Prev close ≥ MA50, current close < MA50 | Orange down-arrow below bar |
| Drop below MA200 | Prev close ≥ MA200, current close < MA200 | Red down-arrow below bar |
| 52w high | High = max of last 252 bars (first occurrence) | Purple square above bar |

Hardcoded price lines on the main chart: 52w high (purple dashed), 52w low (green dashed), `MA50 × 1.25` extended-warning line (red dotted).

## Output contract

On success (stdout):
```json
{"ok": true, "data": {"path": "/abs/path/to/file.html", "type": "flow", "rows": 246}, "meta": {"chart_type": "flow"}}
```

On failure:
```json
{"ok": false, "error": "...", "hint": "..."}
```

## Sparkline alternative (no script)

For tiny in-chat previews, the LLM should render Unicode sparklines directly:
`▁▂▄▆█` plus ANSI green/red. No file generated. Use for 5-20-point series
where a full HTML chart would be overkill.

## Storage

- HTML files: `journal/charts/YYYY-MM-DD-<slug>.html` — gitignored (under `journal/`)
- The skill itself: `.claude/skills/chart/` — committed to public repo

## Related skills

- `longbridge-capital-flow` — produces `flow` JSON
- `longbridge-kline` — produces `kline` JSON (used by both `kline` and `sepa`)
- `capital-rotation` — should call `cohort` at the end
- `market-session-tracker` — may call `flow` and `kline`
- `sepa-strategy` — calls `sepa` as the last step of Step 9, after the textual report
