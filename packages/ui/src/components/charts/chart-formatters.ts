export const shortDateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

// LOCAL CHANGE (PingBoard): axis ticks adapt to the visible span. Every
// PingBoard chart covers 24 hours, where the stock day-granularity formatter
// prints "Jul 20" at every tick and conveys nothing. Locale is left to the
// browser rather than pinned to en-US, since this ships self-hosted worldwide.
const axisTimeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});
const axisDayFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
const axisDayTimeFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const DAY_MS = 24 * 60 * 60 * 1000;

export function formatAxisDate(date: Date, spanMs: number): string {
  if (spanMs <= DAY_MS) return axisTimeFmt.format(date);
  if (spanMs <= 3 * DAY_MS) return axisDayTimeFmt.format(date);
  return axisDayFmt.format(date);
}

export const weekdayDateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

export const hmsTimeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

// `Intl.NumberFormat.prototype.format` is a bound getter — safe to extract.
export const intFmt = new Intl.NumberFormat("en-US").format;
