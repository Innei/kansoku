export const INTRADAY_MAX_COUNT = 1000;

export function clampViewCount(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(Math.floor(n), INTRADAY_MAX_COUNT);
}
