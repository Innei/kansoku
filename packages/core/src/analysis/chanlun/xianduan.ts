import type { Bi, Xianduan } from '@kansoku/shared/types';

export function detectXianduan(bis: Bi[]): Xianduan[] {
  const segments: Xianduan[] = [];
  let i = 0;

  while (i + 2 < bis.length) {
    const dir = bis[i].direction;

    if (bis[i + 1].direction === dir || bis[i + 2].direction !== dir) {
      i += 1;
      continue;
    }

    const end0 = bis[i].end.price;
    const end2 = bis[i + 2].end.price;
    const initialExtends = dir === 'up' ? end2 > end0 : end2 < end0;

    if (!initialExtends) {
      i += 1;
      continue;
    }

    const segBis = [bis[i], bis[i + 1], bis[i + 2]];
    let lastEnd = end2;
    let j = i + 3;

    while (j + 1 < bis.length) {
      if (bis[j].direction === dir || bis[j + 1].direction !== dir) break;

      const candidate = bis[j + 1].end.price;
      const stepExtends = dir === 'up' ? candidate > lastEnd : candidate < lastEnd;
      if (!stepExtends) break;

      segBis.push(bis[j], bis[j + 1]);
      lastEnd = candidate;
      j += 2;
    }

    const pending = j >= bis.length;

    segments.push({
      bis: segBis,
      direction: dir,
      startTime: segBis[0].start.time,
      endTime: pending ? null : segBis[segBis.length - 1].end.time,
      broken: !pending,
    });

    i = j;
  }

  return segments;
}
