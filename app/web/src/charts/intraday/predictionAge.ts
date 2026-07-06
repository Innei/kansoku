import { formatMarketClock } from "../../../../shared/time";

export function predictionMinutesAgo(updatedAt: string): number {
  const updated = new Date(updatedAt);
  return Math.max(0, Math.floor((Date.now() - updated.getTime()) / 60_000));
}

export function predictionAgeText(updatedAt: string): string {
  const updated = new Date(updatedAt);
  const minutesAgo = predictionMinutesAgo(updatedAt);
  return `更新于 ${formatMarketClock(updated, true)}（${minutesAgo} 分钟前）`;
}
