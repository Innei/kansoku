import type { IntradayTfData, RawBar } from '@kansoku/shared/types';
import { ClientError } from '../platform/errors.js';
import { MACD_MIN_BARS } from '../analysis/intraday/constants.js';
import { buildTimeframeView } from '../analysis/intraday/orchestrator.js';
import { coerceIntradayTimeframe } from '../analysis/intraday/timeframe.js';
import { getProvider } from '../marketdata/registry.js';
import { marketOf } from '../symbols/symbol.utils.js';

export const VIEW_PERIODS = ['1m', '30m', 'day', 'week', 'month'] as const;
export type ViewPeriod = (typeof VIEW_PERIODS)[number];

const DEFAULT_COUNT = 1000;
const MAX_COUNT = 2000;
const CACHE_TTL_MS = 5_000;
const CACHE_MAX_ENTRIES = 48;

export interface ViewTimeframeResult {
  period: ViewPeriod;
  bars: number;
  tf: IntradayTfData;
}

const cache = new Map<string, { at: number; value: ViewTimeframeResult }>();

function isViewPeriod(period: string): period is ViewPeriod {
  return (VIEW_PERIODS as readonly string[]).includes(period);
}

function clampCount(raw: number | string | undefined): number {
  const count = Math.trunc(Number(raw ?? DEFAULT_COUNT));
  if (!Number.isFinite(count) || count <= 0) return DEFAULT_COUNT;
  return Math.min(MAX_COUNT, Math.max(MACD_MIN_BARS, count));
}

function truncateAt(bars: RawBar[], asOf: string | undefined): RawBar[] {
  if (!asOf) return bars;
  const cutoff = Date.parse(asOf);
  if (!Number.isFinite(cutoff)) return bars;
  return bars.filter((b) => Date.parse(b.time) <= cutoff);
}

export async function buildViewTimeframe(input: {
  symbol: string;
  period: string;
  count?: number | string;
  as_of?: string;
}): Promise<ViewTimeframeResult> {
  const symbol = input.symbol;
  if (!symbol) throw new ClientError('view-timeframe: `symbol` is required');
  if (!isViewPeriod(input.period)) {
    throw new ClientError(
      `view-timeframe: unsupported period ${JSON.stringify(input.period)}`,
      `period must be one of ${VIEW_PERIODS.join(' | ')}; the 5m/15m/1h analysis timeframes come from the chart doc itself`,
    );
  }
  const period = input.period;
  const count = clampCount(input.count);
  const asOf = input.as_of;

  const key = `${symbol}|${period}|${count}|${asOf ?? ''}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const bars = truncateAt(
    await getProvider(marketOf(symbol)).getKline(symbol, period, count, 'all'),
    asOf,
  );
  if (bars.length < MACD_MIN_BARS) {
    throw new ClientError(
      asOf
        ? `view-timeframe: only ${bars.length} ${period} bars exist at or before ${asOf}`
        : `view-timeframe: only ${bars.length} ${period} bars available for ${symbol}`,
      asOf
        ? '该周期取不到分析时刻的数据——分钟级历史深度有限，换更大的周期或看最新的图'
        : `need at least ${MACD_MIN_BARS} bars for MACD warm-up`,
    );
  }

  const coerced = coerceIntradayTimeframe(bars, period);
  const value: ViewTimeframeResult = {
    period,
    bars: bars.length,
    tf: buildTimeframeView(coerced, period, symbol),
  };

  if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
  cache.set(key, { at: Date.now(), value });
  return value;
}
