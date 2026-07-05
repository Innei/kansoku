import type { CSSProperties } from "react";
import { theme } from "../../theme";

export const UP_COLOR = theme.up;
export const DOWN_COLOR = theme.down;
export const AXIS_COLOR = theme.textSecondary;
export const AXIS_LINE_COLOR = theme.borderStrong;
export const GRID_COLOR = theme.border;
export const ZERO_LINE_COLOR = theme.textMuted;

export const tooltipContentStyle: CSSProperties = {
  backgroundColor: theme.bgSurface,
  border: `1px solid ${theme.border}`,
  borderRadius: 4,
  color: theme.textPrimary,
  fontSize: 12,
};

export const tooltipLabelStyle: CSSProperties = { color: theme.textSecondary, marginBottom: 4 };

export const tooltipItemStyle: CSSProperties = { color: theme.textPrimary };

export function hhmm(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fullTime(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
