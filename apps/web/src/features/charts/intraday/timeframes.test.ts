// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { IntradayBuilt, IntradayTfData } from '@kansoku/shared/types';
import {
  isViewPeriod,
  sanitizeTimeframes,
  tfDataOf,
  useVisibleTimeframes,
  withViewTimeframe,
  ANALYSIS_TFS,
} from './timeframes';

const built = {
  timeframes: { m5: { candles: [{ time: 1 }] }, m15: {}, h1: {} },
  defaultTf: 'm15',
} as unknown as IntradayBuilt;

const viewTf = { candles: [{ time: 9 }] } as unknown as IntradayTfData;

describe('sanitizeTimeframes', () => {
  it('always keeps the three analysis timeframes, whatever was stored', () => {
    expect(sanitizeTimeframes([])).toEqual(ANALYSIS_TFS);
    expect(sanitizeTimeframes(null)).toEqual(ANALYSIS_TFS);
    expect(sanitizeTimeframes(['day'])).toEqual(['m5', 'm15', 'h1', 'day']);
  });

  it('drops unknown keys and orders from shortest to longest', () => {
    expect(sanitizeTimeframes(['month', 'nope', '1m', 'h1'])).toEqual([
      '1m',
      'm5',
      'm15',
      'h1',
      'month',
    ]);
  });

  it('de-duplicates repeated keys', () => {
    expect(sanitizeTimeframes(['day', 'day'])).toEqual(['m5', 'm15', 'h1', 'day']);
  });
});

describe('isViewPeriod', () => {
  it('separates view-only periods from the analysis ones', () => {
    expect(isViewPeriod('1m')).toBe(true);
    expect(isViewPeriod('day')).toBe(true);
    expect(isViewPeriod('m5')).toBe(false);
    expect(isViewPeriod('h1')).toBe(false);
  });
});

describe('withViewTimeframe', () => {
  it('grafts view-timeframe data onto the built doc without touching the analysis ones', () => {
    const merged = withViewTimeframe(built, 'day', viewTf);

    expect(tfDataOf(merged, 'day')).toBe(viewTf);
    expect(tfDataOf(merged, 'm5')).toBe(tfDataOf(built, 'm5'));
    expect(tfDataOf(built, 'day')).toBeUndefined();
  });

  it('returns the doc untouched when there is no data yet or the tf is an analysis one', () => {
    expect(withViewTimeframe(built, 'day', null)).toBe(built);
    expect(withViewTimeframe(built, 'm5', viewTf)).toBe(built);
  });
});

describe('useVisibleTimeframes', () => {
  afterEach(() => localStorage.clear());

  it('defaults to the analysis timeframes and persists toggles', () => {
    const { result } = renderHook(() => useVisibleTimeframes());
    expect(result.current.visibleTfs).toEqual(ANALYSIS_TFS);

    act(() => result.current.toggleTf('30m'));
    expect(result.current.visibleTfs).toEqual(['m5', 'm15', '30m', 'h1']);
    expect(JSON.parse(localStorage.getItem('intraday-timeframes')!)).toEqual([
      'm5',
      'm15',
      '30m',
      'h1',
    ]);

    act(() => result.current.toggleTf('30m'));
    expect(result.current.visibleTfs).toEqual(ANALYSIS_TFS);
  });

  it('refuses to remove an analysis timeframe', () => {
    const { result } = renderHook(() => useVisibleTimeframes());

    act(() => result.current.toggleTf('m5'));

    expect(result.current.visibleTfs).toEqual(ANALYSIS_TFS);
  });
});
