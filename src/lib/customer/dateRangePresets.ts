import { getAppToday } from "@/lib/date";

export type DateRangePreset = "this-month" | "last-month" | "this-year" | "custom" | "all";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
// Day 0 of the next month is the last day of this one (month is 1-12).
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// Everything here is built from today's date in the platform timezone
// (lib/date.ts), never the machine's: a UTC server would still be in last
// month for the first six hours of a Dhaka month, and a Dhaka machine's local
// midnight is the previous day in UTC.

// This month and year in the platform timezone (month is 1-12).
export function appYearMonth(): { year: number; month: number } {
  const [year, month] = getAppToday().split("-").map(Number);
  return { year, month };
}

// The whole of the current month, first day to last.
export function appMonthRange(): { from: string; to: string } {
  const { year, month } = appYearMonth();
  return { from: ymd(year, month, 1), to: ymd(year, month, lastDayOf(year, month)) };
}

// True for a real calendar day written "YYYY-MM-DD" -- for date filters that
// arrive in the URL, which anyone can edit.
export function isIsoDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= lastDayOf(year, month);
}

// Resolves a named preset into concrete dateFrom/dateTo strings the backend
// understands. "all" / no preset means no filter at all (both undefined).
export function resolveDateRange(preset: DateRangePreset | undefined, customFrom?: string, customTo?: string): { dateFrom?: string; dateTo?: string } {
  const today = getAppToday();
  const { year, month } = appYearMonth();

  switch (preset) {
    case "this-month":
      return { dateFrom: ymd(year, month, 1), dateTo: today };
    case "last-month": {
      const lastMonthYear = month === 1 ? year - 1 : year;
      const lastMonth = month === 1 ? 12 : month - 1;
      return { dateFrom: ymd(lastMonthYear, lastMonth, 1), dateTo: ymd(lastMonthYear, lastMonth, lastDayOf(lastMonthYear, lastMonth)) };
    }
    case "this-year":
      return { dateFrom: ymd(year, 1, 1), dateTo: today };
    case "custom":
      return { dateFrom: customFrom, dateTo: customTo };
    default:
      return {};
  }
}
