import type { ReactNode } from "react";
import {
  formatMarketClock,
  formatMarketDateTime,
  formatMarketMonthDayTime,
  localMarketTimeLabel,
  type TimeInput,
} from "../../../shared/time";
import { Tooltip } from "./Tooltip";

type MarketTimeFormat = "clock" | "date-time" | "month-day-time";

interface MarketTimeProps {
  children?: ReactNode;
  className?: string;
  focusable?: boolean;
  format?: MarketTimeFormat;
  includeZone?: boolean;
  value: TimeInput;
}

function formatTime(value: TimeInput, format: MarketTimeFormat, includeZone?: boolean): string {
  if (format === "clock") return formatMarketClock(value, includeZone ?? false);
  if (format === "month-day-time") return formatMarketMonthDayTime(value, includeZone ?? false);
  return formatMarketDateTime(value, includeZone ?? true);
}

export function MarketTime({
  children,
  className,
  focusable,
  format = "date-time",
  includeZone,
  value,
}: MarketTimeProps) {
  const local = localMarketTimeLabel(value);
  const content = local ? `本地时间 ${local}` : null;
  const label = children ?? formatTime(value, format, includeZone);

  if (!content) return <span className={className}>{label}</span>;

  return (
    <Tooltip className={className} content={content} focusable={focusable}>
      <span>{label}</span>
    </Tooltip>
  );
}
