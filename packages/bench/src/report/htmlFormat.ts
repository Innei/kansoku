export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function serializeForScript(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll(' ', '\\u2028')
    .replaceAll(' ', '\\u2029');
}

export function fmtNum(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v)) return '—';
  return v.toFixed(digits);
}

export function fmtScore(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  return (v * 100).toFixed(1);
}

export function fmtRate(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

export function fmtCost(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `$${v.toFixed(4)}`;
}

export function fmtDuration(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  const s = v / 1000;
  return s >= 10 ? `${s.toFixed(0)}s` : `${s.toFixed(1)}s`;
}

export function fmtCount(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v)) return '—';
  return v.toFixed(digits);
}

export function fmtDelta(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  const scaled = v * 100;
  const sign = scaled > 0 ? '+' : scaled < 0 ? '−' : '';
  return `${sign}${Math.abs(scaled).toFixed(1)}`;
}
