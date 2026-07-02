import type { CandlePattern, CandlePatternKind } from "../../../shared/types.js";

const AVG_BODY_WINDOW = 14;
const TREND_LOOKBACK = 4;
const MIN_BODY_RATIO = 0.8;
const STAR_BODY_RATIO = 0.5;
const STAR_TOLERANCE_RATIO = 0.25;
const SHADOW_BODY_RATIO = 2;
const SMALL_SHADOW_RATIO = 0.3;
const HARAMI_BODY_RATIO = 0.6;

export const CANDLE_PATTERN_META: Record<
  CandlePatternKind,
  { label: string; bias: "bullish" | "bearish"; implication: string }
> = {
  bullish_engulfing: {
    label: "看涨吞没",
    bias: "bullish",
    implication: "下跌后阳线实体完全吞没前一根阴线——买方接管，短线反转向上信号；下一根不破吞没线低点则有效",
  },
  bearish_engulfing: {
    label: "看跌吞没",
    bias: "bearish",
    implication: "上涨后阴线实体完全吞没前一根阳线——卖方接管，短线反转向下信号；下一根不破吞没线高点则有效",
  },
  morning_star: {
    label: "启明星",
    bias: "bullish",
    implication: "大阴线 + 小实体星线驻底 + 大阳线收复过半——经典三根 K 线底部反转组合，比单根信号更可靠",
  },
  evening_star: {
    label: "黄昏星",
    bias: "bearish",
    implication: "大阳线 + 小实体星线滞涨 + 大阴线跌破过半——经典三根 K 线顶部反转组合，比单根信号更可靠",
  },
  hammer: {
    label: "锤子线",
    bias: "bullish",
    implication: "下跌末端长下影小实体——低位被买盘拉回，止跌信号；下一根收在锤子实体上方则确认",
  },
  hanging_man: {
    label: "上吊线",
    bias: "bearish",
    implication: "上涨末端出现长下影小实体——盘中曾被大幅打压，多头开始不稳的警示；跌破其低点则确认转弱",
  },
  inverted_hammer: {
    label: "倒锤子",
    bias: "bullish",
    implication: "下跌末端长上影小实体——买方开始试探性上攻，反转苗头；需下一根阳线确认，可靠性低于锤子线",
  },
  shooting_star: {
    label: "射击之星",
    bias: "bearish",
    implication: "上涨末端长上影小实体——冲高被抛压砸回，见顶警示；跌破其低点则确认",
  },
  dark_cloud_cover: {
    label: "乌云盖顶",
    bias: "bearish",
    implication: "阴线高开后深入前一根阳线实体过半——上攻动能被吞噬，看跌反转信号，强度略弱于看跌吞没",
  },
  piercing_line: {
    label: "刺透形态",
    bias: "bullish",
    implication: "阳线低开后收复前一根阴线实体过半——买方强力反击，看涨反转信号，强度略弱于看涨吞没",
  },
  bullish_harami: {
    label: "看涨孕线",
    bias: "bullish",
    implication: "大阴线后小实体完全孕于其中——抛压衰竭的警示信号，方向未定，需后续阳线确认后才可信",
  },
  bearish_harami: {
    label: "看跌孕线",
    bias: "bearish",
    implication: "大阳线后小实体完全孕于其中——买盘衰竭的警示信号，方向未定，需后续阴线确认后才可信",
  },
  three_white_soldiers: {
    label: "红三兵",
    bias: "bullish",
    implication: "连续三根步步高的中大阳线——买方持续控盘，底部反转或强势延续；若出现在大涨后高位则谨防力竭",
  },
  three_black_crows: {
    label: "三只乌鸦",
    bias: "bearish",
    implication: "连续三根步步低的中大阴线——卖方持续控盘，顶部反转或弱势延续信号，杀伤力大",
  },
};

export function detectCandlePatterns(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  timesTs: number[],
): CandlePattern[] {
  const n = closes.length;
  const body = (i: number) => Math.abs(closes[i] - opens[i]);
  const range = (i: number) => highs[i] - lows[i];
  const green = (i: number) => closes[i] > opens[i];
  const red = (i: number) => closes[i] < opens[i];
  const bodyTop = (i: number) => Math.max(opens[i], closes[i]);
  const bodyBottom = (i: number) => Math.min(opens[i], closes[i]);
  const upperShadow = (i: number) => highs[i] - bodyTop(i);
  const lowerShadow = (i: number) => bodyBottom(i) - lows[i];

  const avgBody = (i: number) => {
    const from = Math.max(0, i - AVG_BODY_WINDOW);
    let sum = 0;
    let count = 0;
    for (let j = from; j < i; j++) {
      sum += body(j);
      count += 1;
    }
    return count ? sum / count : 0;
  };

  const downtrendInto = (s: number) => s >= TREND_LOOKBACK && closes[s] < closes[s - TREND_LOOKBACK];
  const uptrendInto = (s: number) => s >= TREND_LOOKBACK && closes[s] > closes[s - TREND_LOOKBACK];

  const taken = new Map<number, CandlePatternKind>();
  const out: CandlePattern[] = [];
  const push = (kind: CandlePatternKind, i: number, price: number) => {
    if (taken.has(i)) return;
    taken.set(i, kind);
    const meta = CANDLE_PATTERN_META[kind];
    out.push({ kind, time: timesTs[i], price, bias: meta.bias, label: meta.label, implication: meta.implication });
  };

  for (let i = 2; i < n; i++) {
    const ab = avgBody(i);
    if (ab <= 0) continue;
    const b1 = body(i - 2);
    const b2 = body(i - 1);
    const b3 = body(i);
    const mid1 = (opens[i - 2] + closes[i - 2]) / 2;

    if (
      red(i - 2) &&
      b1 >= ab &&
      b2 <= STAR_BODY_RATIO * b1 &&
      bodyTop(i - 1) <= closes[i - 2] + STAR_TOLERANCE_RATIO * b1 &&
      green(i) &&
      b3 >= MIN_BODY_RATIO * ab &&
      closes[i] >= mid1 &&
      downtrendInto(i - 2)
    ) {
      push("morning_star", i, lows[i - 1]);
    } else if (
      green(i - 2) &&
      b1 >= ab &&
      b2 <= STAR_BODY_RATIO * b1 &&
      bodyBottom(i - 1) >= closes[i - 2] - STAR_TOLERANCE_RATIO * b1 &&
      red(i) &&
      b3 >= MIN_BODY_RATIO * ab &&
      closes[i] <= mid1 &&
      uptrendInto(i - 2)
    ) {
      push("evening_star", i, highs[i - 1]);
    }
  }

  for (let i = 2; i < n; i++) {
    if (taken.get(i - 1) === "three_white_soldiers" || taken.get(i - 1) === "three_black_crows") continue;
    const ab = avgBody(i);
    if (ab <= 0) continue;
    const strong = (j: number) => body(j) >= MIN_BODY_RATIO * ab;

    if (
      green(i - 2) &&
      green(i - 1) &&
      green(i) &&
      strong(i - 2) &&
      strong(i - 1) &&
      strong(i) &&
      closes[i - 1] > closes[i - 2] &&
      closes[i] > closes[i - 1] &&
      opens[i - 1] >= bodyBottom(i - 2) &&
      opens[i] >= bodyBottom(i - 1)
    ) {
      push("three_white_soldiers", i, lows[i - 2]);
    } else if (
      red(i - 2) &&
      red(i - 1) &&
      red(i) &&
      strong(i - 2) &&
      strong(i - 1) &&
      strong(i) &&
      closes[i - 1] < closes[i - 2] &&
      closes[i] < closes[i - 1] &&
      opens[i - 1] <= bodyTop(i - 2) &&
      opens[i] <= bodyTop(i - 1)
    ) {
      push("three_black_crows", i, highs[i - 2]);
    }
  }

  for (let i = 1; i < n; i++) {
    const ab = avgBody(i);
    if (ab <= 0) continue;
    const bA = body(i - 1);
    const bB = body(i);
    const midA = (opens[i - 1] + closes[i - 1]) / 2;

    if (
      bB > bA &&
      bB >= MIN_BODY_RATIO * ab &&
      red(i - 1) &&
      green(i) &&
      opens[i] <= closes[i - 1] &&
      closes[i] >= opens[i - 1] &&
      downtrendInto(i - 1)
    ) {
      push("bullish_engulfing", i, lows[i]);
    } else if (
      bB > bA &&
      bB >= MIN_BODY_RATIO * ab &&
      green(i - 1) &&
      red(i) &&
      opens[i] >= closes[i - 1] &&
      closes[i] <= opens[i - 1] &&
      uptrendInto(i - 1)
    ) {
      push("bearish_engulfing", i, highs[i]);
    } else if (
      red(i) &&
      green(i - 1) &&
      bA >= ab &&
      bB >= MIN_BODY_RATIO * ab &&
      opens[i] >= closes[i - 1] &&
      closes[i] < midA &&
      closes[i] > opens[i - 1] &&
      uptrendInto(i - 1)
    ) {
      push("dark_cloud_cover", i, highs[i]);
    } else if (
      green(i) &&
      red(i - 1) &&
      bA >= ab &&
      bB >= MIN_BODY_RATIO * ab &&
      opens[i] <= closes[i - 1] &&
      closes[i] > midA &&
      closes[i] < opens[i - 1] &&
      downtrendInto(i - 1)
    ) {
      push("piercing_line", i, lows[i]);
    } else if (
      red(i - 1) &&
      bA >= ab &&
      bB <= HARAMI_BODY_RATIO * bA &&
      bodyTop(i) <= opens[i - 1] &&
      bodyBottom(i) >= closes[i - 1] &&
      downtrendInto(i - 1)
    ) {
      push("bullish_harami", i, lows[i]);
    } else if (
      green(i - 1) &&
      bA >= ab &&
      bB <= HARAMI_BODY_RATIO * bA &&
      bodyTop(i) <= closes[i - 1] &&
      bodyBottom(i) >= opens[i - 1] &&
      uptrendInto(i - 1)
    ) {
      push("bearish_harami", i, highs[i]);
    }
  }

  for (let i = 1; i < n; i++) {
    const r = range(i);
    const b = body(i);
    if (r <= 0 || b <= 0) continue;
    const longLower = lowerShadow(i) >= SHADOW_BODY_RATIO * b && upperShadow(i) <= SMALL_SHADOW_RATIO * b;
    const longUpper = upperShadow(i) >= SHADOW_BODY_RATIO * b && lowerShadow(i) <= SMALL_SHADOW_RATIO * b;
    if (!longLower && !longUpper) continue;
    if (b > 0.35 * r) continue;

    if (longLower && downtrendInto(i)) push("hammer", i, lows[i]);
    else if (longLower && uptrendInto(i)) push("hanging_man", i, highs[i]);
    else if (longUpper && downtrendInto(i)) push("inverted_hammer", i, lows[i]);
    else if (longUpper && uptrendInto(i)) push("shooting_star", i, highs[i]);
  }

  return out.sort((a, b) => a.time - b.time);
}
