export const MARKET_TIME_ZONE = "America/New_York";

type TimeInput = Date | number | string;

interface FormatParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MARKET_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MARKET_TIME_ZONE,
  month: "short",
});

function toDate(input: TimeInput): Date {
  if (input instanceof Date) return input;
  if (typeof input === "number") return new Date(input * 1000);
  return new Date(input);
}

function parts(input: TimeInput): FormatParts {
  const p = Object.fromEntries(dateTimeFormatter.formatToParts(toDate(input)).map((part) => [part.type, part.value]));
  return {
    year: String(p.year ?? ""),
    month: String(p.month ?? ""),
    day: String(p.day ?? ""),
    hour: String(p.hour ?? ""),
    minute: String(p.minute ?? ""),
  };
}

export function formatMarketDateTime(input: TimeInput, includeZone = true): string {
  const p = parts(input);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}${includeZone ? " ET" : ""}`;
}

export function formatMarketMonthDayTime(input: TimeInput, includeZone = false): string {
  const p = parts(input);
  return `${p.month}-${p.day} ${p.hour}:${p.minute}${includeZone ? " ET" : ""}`;
}

export function formatMarketClock(input: TimeInput, includeZone = false): string {
  const p = parts(input);
  return `${p.hour}:${p.minute}${includeZone ? " ET" : ""}`;
}

export function formatMarketTick(input: TimeInput, tickMarkType: number): string {
  if (tickMarkType === 0) return parts(input).year;
  if (tickMarkType === 1) return monthFormatter.format(toDate(input));
  if (tickMarkType === 2) {
    const p = parts(input);
    return `${p.month}-${p.day}`;
  }
  return formatMarketClock(input);
}
