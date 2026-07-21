import type { Fenxing } from '@kansoku/shared/types';
import { describe, expect, it } from 'vitest';
import { detectBi } from './bi.js';

function fenxing(kind: 'top' | 'bottom', barIndex: number, price: number): Fenxing {
  return { time: barIndex * 60, price, kind, confirmed: true, barIndex };
}

describe('detectBi', () => {
  it('returns an empty array for empty input', () => {
    expect(detectBi([])).toEqual([]);
  });

  it('returns an empty array for a single fenxing', () => {
    expect(detectBi([fenxing('top', 0, 100)])).toEqual([]);
  });

  it('collapses two same-kind top fenxings in Step 1, leaving no pair to form a stroke', () => {
    const t0 = fenxing('top', 0, 100);
    const t1 = fenxing('top', 5, 105);

    expect(detectBi([t0, t1])).toEqual([]);
  });

  it('collapses two same-kind bottom fenxings in Step 1, leaving no pair to form a stroke', () => {
    const b0 = fenxing('bottom', 0, 95);
    const b1 = fenxing('bottom', 5, 90);

    expect(detectBi([b0, b1])).toEqual([]);
  });

  it('rejects two alternating fenxings separated by fewer than 4 bars', () => {
    const b0 = fenxing('bottom', 0, 98);
    const t1 = fenxing('top', 3, 104);

    expect(detectBi([b0, t1])).toEqual([]);
  });

  it('forms one up stroke at the minimum valid separation of 4 bars', () => {
    const b0 = fenxing('bottom', 0, 98);
    const t1 = fenxing('top', 4, 104.5);

    const result = detectBi([b0, t1]);

    expect(result).toEqual([{ start: b0, end: t1, direction: 'up', bars: 5 }]);
  });

  it('forms one up stroke across a larger separation', () => {
    const b0 = fenxing('bottom', 0, 98);
    const t1 = fenxing('top', 12, 110);

    const result = detectBi([b0, t1]);

    expect(result).toEqual([{ start: b0, end: t1, direction: 'up', bars: 13 }]);
  });

  it('merges three consecutive tops keeping the highest, then forms a down stroke to the following bottom', () => {
    const t0 = fenxing('top', 0, 100);
    const t1 = fenxing('top', 5, 108);
    const t2 = fenxing('top', 10, 103);
    const b3 = fenxing('bottom', 15, 92);

    const result = detectBi([t0, t1, t2, b3]);

    expect(result).toEqual([{ start: t1, end: b3, direction: 'down', bars: 11 }]);
  });

  it('merges three consecutive bottoms keeping the lowest, then forms an up stroke to the following top', () => {
    const b0 = fenxing('bottom', 0, 95);
    const b1 = fenxing('bottom', 6, 89);
    const b2 = fenxing('bottom', 11, 93);
    const t3 = fenxing('top', 16, 104);

    const result = detectBi([b0, b1, b2, t3]);

    expect(result).toEqual([{ start: b1, end: t3, direction: 'up', bars: 11 }]);
  });

  it('forms multiple strokes across an alternating sequence', () => {
    const b0 = fenxing('bottom', 0, 90);
    const t1 = fenxing('top', 5, 100);
    const b2 = fenxing('bottom', 12, 92);
    const t3 = fenxing('top', 18, 105);

    const result = detectBi([b0, t1, b2, t3]);

    expect(result).toEqual([
      { start: b0, end: t1, direction: 'up', bars: 6 },
      { start: t1, end: b2, direction: 'down', bars: 8 },
      { start: b2, end: t3, direction: 'up', bars: 7 },
    ]);
  });

  it('assigns direction purely from the start fenxing kind: bottom-to-top is up, top-to-bottom is down', () => {
    const b0 = fenxing('bottom', 0, 90);
    const t1 = fenxing('top', 5, 100);
    const b2 = fenxing('bottom', 12, 92);
    const t3 = fenxing('top', 18, 105);

    const result = detectBi([b0, t1, b2, t3]);

    expect(result.map((bi) => bi.direction)).toEqual(['up', 'down', 'up']);
  });
});
