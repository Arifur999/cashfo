import { getAppToday } from "@/lib/date";

export type DateRangePreset = "this-month" | "last-month" | "this-year" | "custom" | "all";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
// Day 0 of the next month is the last day of this one (month is 1-12).
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// Resolves a named preset into concrete dateFrom/dateTo strings the backend
// understands. "all" / no preset means no filter at all (both undefined).
// Built from today's date in the platform timezone (lib/date.ts), never the
// machine's: a UTC server would still be in last month for the first six
// hours of a Dhaka month, and a Dhaka machine's local midnight is the
// previous day in UTC.
export function resolveDateRange(preset: DateRangePreset | undefined, customFrom?: string, customTo?: string): { dateFrom?: string; dateTo?: string } {
  const today = getAppToday();
  const [year, month] = today.split("-").map(Number);

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
