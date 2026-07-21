import type { Bi, Fenxing } from '@kansoku/shared/types';

export function detectBi(fenxings: Fenxing[]): Bi[] {
  const filtered: Fenxing[] = [];

  for (let i = 0; i < fenxings.length; i++) {
    const f = fenxings[i];
    const last = filtered[filtered.length - 1];

    if (filtered.length > 0 && last.kind === f.kind) {
      const isMoreExtreme = f.kind === 'top' ? f.price > last.price : f.price < last.price;
      if (isMoreExtreme) filtered[filtered.length - 1] = f;
    } else {
      filtered.push(f);
    }
  }

  const bis: Bi[] = [];

  for (let i = 0; i <= filtered.length - 2; i++) {
    const start = filtered[i];
    const end = filtered[i + 1];

    if (end.barIndex - start.barIndex < 4) continue;

    bis.push({
      start,
      end,
      direction: start.kind === 'bottom' ? 'up' : 'down',
      bars: end.barIndex - start.barIndex + 1,
    });
  }

  return bis;
}
