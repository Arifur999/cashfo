import { monthRangeDays } from "./balanceDisplay";

// The report pages' period (the canvas's one "Choose period" picker): a
// month of a year, a whole year, the reader's own days, or -- where a page
// offers it -- all time. Kept in the address so a period can be linked to,
// and pure so it is tested apart from the pages.

export type Params = Record<string, string | string[] | undefined>;

export type Period = { kind: "month"; month: number; year: number } | { kind: "year"; year: number } | { kind: "custom"; from: string; to: string };
export type PickedPeriod = Period | { kind: "all" };

export interface YearMonth {
  year: number;
  // 1-12
  month: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const text = (value: string | string[] | undefined): string | undefined => (typeof value === "string" ? value : undefined);

export const isYear = (value: unknown): value is string => typeof value === "string" && /^\d{4}$/.test(value) && Number(value) >= 2000 && Number(value) <= 2100;

// A real calendar day written YYYY-MM-DD.
export function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const isMonthKey = (value: unknown): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

// The period's first and last day, as the API's date filters take them;
// nothing for all time.
export function periodRange(period: PickedPeriod): { dateFrom?: string; dateTo?: string } {
  if (period.kind === "all") return {};
  if (period.kind === "month") return { dateFrom: `${period.year}-${pad(period.month)}-01`, dateTo: `${period.year}-${pad(period.month)}-${pad(lastDayOf(period.year, period.month))}` };
  if (period.kind === "year") return { dateFrom: `${period.year}-01-01`, dateTo: `${period.year}-12-31` };
  return { dateFrom: period.from, dateTo: period.to };
}

// The address's own words for a period, and every key a period has ever
// been written with (the older Balance links' too), so writing one clears
// the others.
const PERIOD_KEYS = ["month", "year", "period", "from", "to", "range", "start", "end", "dateFrom", "dateTo"];

// The period an address asks for: ?month=&year=, ?period=year&year=,
// ?from=&to= -- or `fallback` with none of them (all time on Balance). The
// older Balance links (?range=this-month|last-month|this-year|custom with
// dateFrom/dateTo days or start/end months) open what they meant; a
// period that can't be read is the fallback too.
export function readPickedPeriod(params: Params, current: YearMonth, fallback: PickedPeriod = { kind: "all" }): PickedPeriod {
  const from = text(params.from);
  const to = text(params.to);
  if (from !== undefined || to !== undefined) return isDay(from) && isDay(to) && from <= to ? { kind: "custom", from, to } : fallback;

  const year = text(params.year);
  if (text(params.period) === "year") return isYear(year) ? { kind: "year", year: Number(year) } : fallback;
  if (text(params.month) !== undefined) {
    const month = Number(text(params.month));
    return Number.isInteger(month) && month >= 1 && month <= 12 && isYear(year) ? { kind: "month", month, year: Number(year) } : fallback;
  }

  switch (text(params.range)) {
    case "this-month":
      return { kind: "month", ...current };
    case "last-month":
      return current.month === 1 ? { kind: "month", month: 12, year: current.year - 1 } : { kind: "month", month: current.month - 1, year: current.year };
    case "this-year":
      return { kind: "year", year: current.year };
    case "custom": {
      const dateFrom = text(params.dateFrom);
      const dateTo = text(params.dateTo);
      if (isDay(dateFrom) && isDay(dateTo) && dateFrom <= dateTo) return { kind: "custom", from: dateFrom, to: dateTo };
      const start = text(params.start);
      if (isMonthKey(start)) {
        const end = text(params.end);
        const days = monthRangeDays(start, isMonthKey(end) ? end : null);
        return { kind: "custom", from: days.dateFrom, to: days.dateTo };
      }
      return fallback;
    }
    default:
      return fallback;
  }
}

// The same address with another period: the rest kept (the account, the
// search), the page back to the first, `fallback` written as nothing.
export function periodHref(pathname: string, params: Params, period: PickedPeriod, fallback: PickedPeriod = { kind: "all" }): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || key === "page" || PERIOD_KEYS.includes(key)) continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  if (!samePeriod(period, fallback)) {
    if (period.kind === "month") {
      query.set("month", String(period.month));
      query.set("year", String(period.year));
    } else if (period.kind === "year") {
      query.set("period", "year");
      query.set("year", String(period.year));
    } else if (period.kind === "custom") {
      query.set("from", period.from);
      query.set("to", period.to);
    }
  }
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function samePeriod(a: PickedPeriod, b: PickedPeriod): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
