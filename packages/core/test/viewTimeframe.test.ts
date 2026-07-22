import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketDataProvider } from '../src/marketdata/types.js';
import type { RawBar } from '@kansoku/shared/types';

const provider: Partial<MarketDataProvider> = {};

vi.mock('../src/marketdata/registry.js', () => ({
  getProvider: () => provider,
}));

const { buildViewTimeframe, VIEW_PERIODS } = await import('../src/charts/viewTimeframe.js');

// 11:00Z is 07:00 in New York — pre-market — so a 300-minute run crosses into
// the regular session and exercises the off-session mask.
function bars(count: number, startMs = Date.parse('2026-07-20T11:00:00.000Z')): RawBar[] {
  return Array.from({ length: count }, (_, i) => {
    const close = 100 + Math.sin(i / 3) * 5;
    return {
      time: new Date(startMs + i * 60_000).toISOString(),
      open: String(close - 0.2),
      high: String(close + 0.4),
      low: String(close - 0.5),
      close: String(close),
      volume: 1000 + i,
    };
  });
}

let fetched: { symbol: string; period: string; count: number; session?: string }[] = [];

beforeEach(() => {
  fetched = [];
  provider.getKline = vi.fn(
    async (symbol: string, period: string, count: number, session?: string) => {
      fetched.push({ symbol, period, count, session });
      return bars(300);
    },
  );
});

describe('buildViewTimeframe', () => {
  it('rejects periods outside the view-only whitelist', async () => {
    await expect(buildViewTimeframe({ symbol: 'NVDA.US', period: 'm5' })).rejects.toThrow(
      /unsupported period/,
    );
    await expect(buildViewTimeframe({ symbol: 'NVDA.US', period: '' })).rejects.toThrow(
      /unsupported period/,
    );
  });

  it('accepts every whitelisted period and returns a renderable timeframe view', async () => {
    for (const period of VIEW_PERIODS) {
      const result = await buildViewTimeframe({ symbol: `NVDA.US?${period}`, period });

      expect(result.period).toBe(period);
      expect(result.bars).toBe(300);
      expect(result.tf.candles).toHaveLength(300);
      expect(result.tf.macdHist.length).toBeGreaterThan(0);
      expect(result.tf.chanStructure).toBeTruthy();
    }
  });

  it('carries no AI overlay — view timeframes are not part of the analysis', async () => {
    const { tf } = await buildViewTimeframe({ symbol: 'NOAI.US', period: '30m' });

    expect(tf.markers.every((m) => m.group !== 'ai')).toBe(true);
  });

  it('carries no pro annotations while the paid detectors are inactive', async () => {
    const { tf } = await buildViewTimeframe({ symbol: 'NOPRO.US', period: 'day' });

    expect(tf.autoDivergence).toEqual([]);
    expect(tf.autoBeichi).toEqual([]);
    expect(tf.pattern123).toEqual([]);
    expect(tf.secondBreakouts).toEqual([]);
  });

  it('leaves daily-and-longer bars unmasked — a pre/post/overnight band makes no sense there', async () => {
    for (const period of ['day', 'week', 'month'] as const) {
      const { tf } = await buildViewTimeframe({ symbol: `MASK.US?${period}`, period });

      expect(tf.offSession).toEqual([]);
    }
  });

  it('still masks off-hours on intraday view periods', async () => {
    const { tf } = await buildViewTimeframe({ symbol: 'MASK1M.US', period: '1m' });

    expect(tf.offSession?.length ?? 0).toBeGreaterThan(0);
  });

  it('computes an intraday VWAP for 1m but not for daily bars', async () => {
    const minute = await buildViewTimeframe({ symbol: 'VWAP1.US', period: '1m' });
    const daily = await buildViewTimeframe({ symbol: 'VWAP2.US', period: 'day' });

    expect(minute.tf.vwap).toBeTruthy();
    expect(daily.tf.vwap).toBeUndefined();
  });

  it('truncates to as_of so a frozen chart never shows bars from after its analysis', async () => {
    const all = bars(300);
    const cutoff = all[199].time;

    const result = await buildViewTimeframe({ symbol: 'CUT.US', period: '30m', as_of: cutoff });

    expect(result.bars).toBe(200);
    expect(result.tf.candles.at(-1)?.time).toBe(Math.floor(Date.parse(cutoff) / 1000));
  });

  it('errors instead of silently showing fresh bars when as_of predates the available history', async () => {
    await expect(
      buildViewTimeframe({ symbol: 'OLD.US', period: '1m', as_of: '2020-01-01T00:00:00.000Z' }),
    ).rejects.toThrow(/only 0 1m bars exist at or before/);
  });

  it('errors when the provider returns fewer bars than MACD needs', async () => {
    provider.getKline = vi.fn(async () => bars(10));

    await expect(buildViewTimeframe({ symbol: 'SHORT.US', period: 'week' })).rejects.toThrow(
      /only 10 week bars available/,
    );
  });

  it('serves a repeat request from cache instead of re-hitting the provider', async () => {
    await buildViewTimeframe({ symbol: 'CACHE.US', period: 'day' });
    await buildViewTimeframe({ symbol: 'CACHE.US', period: 'day' });

    expect(fetched.filter((f) => f.symbol === 'CACHE.US')).toHaveLength(1);
  });

  it('clamps the bar count and always asks for the full session', async () => {
    await buildViewTimeframe({ symbol: 'CLAMP1.US', period: 'day', count: 99_999 });
    await buildViewTimeframe({ symbol: 'CLAMP2.US', period: 'day', count: 1 });
    await buildViewTimeframe({ symbol: 'CLAMP3.US', period: 'day', count: 'nonsense' });

    expect(fetched.map((f) => f.count)).toEqual([2000, 60, 1000]);
    expect(fetched.every((f) => f.session === 'all')).toBe(true);
  });
});
