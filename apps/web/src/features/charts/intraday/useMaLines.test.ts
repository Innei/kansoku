// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ema } from '@kansoku/core/analysis/indicators';
import {
  computeMaSeries,
  defaultMaLines,
  sanitizeMaLines,
  useMaLines,
  MAX_MA_LINES,
  MAX_MA_PERIOD,
  type MaLine,
} from './useMaLines';

const line = (period: number, extra: Partial<MaLine> = {}): MaLine => ({
  id: `ma-${period}`,
  period,
  color: '#ffffff',
  visible: true,
  ...extra,
});

describe('sanitizeMaLines', () => {
  it('falls back to the defaults for non-arrays and for input where nothing survives', () => {
    expect(sanitizeMaLines(null)).toEqual(defaultMaLines());
    expect(sanitizeMaLines('nope')).toEqual(defaultMaLines());
    expect(sanitizeMaLines([])).toEqual(defaultMaLines());
    expect(sanitizeMaLines([{ period: 0 }, { period: -5 }])).toEqual(defaultMaLines());
  });

  it('drops periods outside the allowed range', () => {
    const kept = sanitizeMaLines([line(1), line(9), line(MAX_MA_PERIOD + 1), line(50)]);

    expect(kept.map((l) => l.period)).toEqual([9, 50]);
  });

  it('drops duplicate periods, keeping the first', () => {
    const kept = sanitizeMaLines([line(9, { color: '#111111' }), line(9, { color: '#222222' })]);

    expect(kept).toHaveLength(1);
    expect(kept[0].color).toBe('#111111');
  });

  it('truncates to the line cap', () => {
    const kept = sanitizeMaLines([5, 10, 20, 30, 40, 50, 60].map((p) => line(p)));

    expect(kept).toHaveLength(MAX_MA_LINES);
    expect(kept.map((l) => l.period)).toEqual([5, 10, 20, 30, 40]);
  });

  it('truncates fractional periods and keeps an explicit hidden flag', () => {
    const kept = sanitizeMaLines([{ period: 20.7, visible: false }]);

    expect(kept[0].period).toBe(20);
    expect(kept[0].visible).toBe(false);
  });

  it('defaults visible to true when the flag is missing', () => {
    expect(sanitizeMaLines([{ period: 20 }])[0].visible).toBe(true);
  });
});

describe('computeMaSeries', () => {
  const candles = Array.from({ length: 30 }, (_, i) => ({ time: 1000 + i, close: 100 + i }));

  it('matches the core ema implementation and drops the warm-up bars', () => {
    const [series] = computeMaSeries(candles, [line(5)]);
    const expected = ema(
      candles.map((c) => c.close),
      5,
    );

    expect(series.data).toHaveLength(candles.length - 4);
    expect(series.data[0]).toEqual({ time: candles[4].time, value: expected[4] });
    expect(series.last).toBe(expected.at(-1));
  });

  it('reports a null last value when there are fewer bars than the period', () => {
    const [series] = computeMaSeries(candles.slice(0, 3), [line(10)]);

    expect(series.data).toEqual([]);
    expect(series.last).toBeNull();
  });

  it('keeps one entry per configured line, hidden ones included', () => {
    const series = computeMaSeries(candles, [line(5), line(10, { visible: false })]);

    expect(series.map((s) => s.line.period)).toEqual([5, 10]);
  });
});

describe('useMaLines', () => {
  afterEach(() => localStorage.clear());

  it('starts from the defaults and writes every edit back to localStorage', () => {
    const { result } = renderHook(() => useMaLines());

    expect(result.current.maLines.map((l) => l.period)).toEqual([9, 21, 55]);

    act(() => result.current.updateMaLine('ma-9', { period: 12, visible: false }));

    const stored = sanitizeMaLines(JSON.parse(localStorage.getItem('intraday-ma-lines')!));
    expect(stored[0].period).toBe(12);
    expect(stored[0].visible).toBe(false);
  });

  it('reloads what an earlier session stored', () => {
    localStorage.setItem(
      'intraday-ma-lines',
      JSON.stringify([{ id: 'ma-20', period: 20, color: '#abcdef', visible: true }]),
    );

    const { result } = renderHook(() => useMaLines());

    expect(result.current.maLines).toEqual([
      { id: 'ma-20', period: 20, color: '#abcdef', visible: true },
    ]);
  });

  it('stops adding lines at the cap and removes by id', () => {
    const { result } = renderHook(() => useMaLines());

    act(() => result.current.addMaLine());
    act(() => result.current.addMaLine());
    act(() => result.current.addMaLine());
    expect(result.current.maLines).toHaveLength(MAX_MA_LINES);

    act(() => result.current.removeMaLine(result.current.maLines[0].id));
    expect(result.current.maLines).toHaveLength(MAX_MA_LINES - 1);
  });
});
