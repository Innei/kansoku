import type { AnalysisOutcome, IntradayPrediction, RawBar } from "../../../../shared/types.js";

// A neutral (range-bound) call resolves to held_range after one full regular
// session (6.5h) of post-anchor bars without a close outside the zone.
const NEUTRAL_HELD_HORIZON_SEC = 6.5 * 3600;

function toSec(iso: string): number {
  return Math.floor(Date.parse(iso) / 1000);
}

export function zoneFromPrediction(
  prediction: Pick<IntradayPrediction, "range_bound_plan" | "range_plan"> | null | undefined,
): { low: number; high: number } | null {
  const rp = prediction?.range_bound_plan ?? prediction?.range_plan;
  const low = Number(rp?.low);
  const high = Number(rp?.high);
  return Number.isFinite(low) && Number.isFinite(high) && low < high ? { low, high } : null;
}

function anchorCovered(anchorSec: number, bars: RawBar[]): boolean {
  if (bars.length === 0) return true;
  const firstSec = toSec(bars[0].time);
  if (firstSec <= anchorSec) return true;
  const tolerance = bars.length > 1 ? Math.max(0, toSec(bars[1].time) - firstSec) : Infinity;
  return firstSec - anchorSec <= tolerance;
}

export function judgeOutcome(
  direction: "long" | "short" | "neutral",
  anchor: { time: string; price: number },
  plan: { stop?: number; target1?: number } | null,
  bars: RawBar[],
  zone?: { low: number; high: number } | null,
): AnalysisOutcome | null {
  const anchorSec = toSec(anchor.time);

  if (direction === "neutral") {
    if (!zone) return null;
    if (!anchorCovered(anchorSec, bars)) return null;

    const following = bars.filter((bar) => toSec(bar.time) > anchorSec);
    if (following.length === 0) {
      return { status: "open", pct_since_anchor: 0, resolved_at: null };
    }
    const lastClose = Number(following[following.length - 1].close);
    const pct = (lastClose / anchor.price - 1) * 100;
    for (const bar of following) {
      const close = Number(bar.close);
      // Close-based break so a single wick poke doesn't fail the call.
      if (close > zone.high || close < zone.low) {
        return { status: "broke_range", pct_since_anchor: pct, resolved_at: toSec(bar.time) };
      }
      if (toSec(bar.time) - anchorSec >= NEUTRAL_HELD_HORIZON_SEC) {
        return { status: "held_range", pct_since_anchor: pct, resolved_at: toSec(bar.time) };
      }
    }
    return { status: "open", pct_since_anchor: pct, resolved_at: null };
  }

  if (!plan || plan.stop === undefined || plan.target1 === undefined) return null;

  const { stop, target1 } = plan;
  if (!anchorCovered(anchorSec, bars)) return null;

  const following = bars.filter((bar) => toSec(bar.time) > anchorSec);

  if (following.length === 0) {
    return { status: "open", pct_since_anchor: 0, resolved_at: null };
  }

  for (const bar of following) {
    const high = Number(bar.high);
    const low = Number(bar.low);
    const hitStop = direction === "long" ? low <= stop : high >= stop;
    const hitTarget = direction === "long" ? high >= target1 : low <= target1;
    // Same-bar collision: when both stop and target trigger inside one bar, the
    // stop is assumed to have been touched first (conservative).
    if (hitStop) {
      return {
        status: "hit_stop",
        pct_since_anchor: (Number(following[following.length - 1].close) / anchor.price - 1) * 100,
        resolved_at: toSec(bar.time),
      };
    }
    if (hitTarget) {
      return {
        status: "hit_target",
        pct_since_anchor: (Number(following[following.length - 1].close) / anchor.price - 1) * 100,
        resolved_at: toSec(bar.time),
      };
    }
  }

  const lastClose = Number(following[following.length - 1].close);
  return { status: "open", pct_since_anchor: (lastClose / anchor.price - 1) * 100, resolved_at: null };
}
