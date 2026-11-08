// The period the admin's report pages show (Dashboard, Analytics): the
// canvas's one "Choose period" picker, a month by default. Kept in the
// address like the customer reports (?month=&year=, ?period=year&year=,
// ?from=&to=), and pure so the pages and their tests agree.
import type { ActiveMonth } from "./customer/api";
import { periodRange, readPickedPeriod, type Params, type Period } from "./customer/period";

// The month `today` (YYYY-MM-DD) is in: the pages' own period.
export const monthOf = (today: string): Extract<Period, { kind: "month" }> => ({ kind: "month", year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });

// The period an admin page's address asks for, else this month. These
// pages have no "all time".
export function adminPeriodOf(params: Params, today: string): Period {
  const fallback = monthOf(today);
  const picked = readPickedPeriod(params, { year: fallback.year, month: fallback.month }, fallback);
  return picked.kind === "all" ? fallback : picked;
}

// Its first and last day, as the API takes them: a month or a year whole,
// even while it runs (the API cuts it at today).
export function periodDays(period: Period): { from: string; to: string } {
  const { dateFrom, dateTo } = periodRange(period);
  return { from: dateFrom ?? "", to: dateTo ?? "" };
}

// The months the picker offers: from the first customer's to today's. The
// rest are greyed out; with nobody yet, only the months to come are.
export function monthsSince(since: string | null, today: string): ActiveMonth[] | null {
  if (!since || since > today) return null;
  const months: ActiveMonth[] = [];
  let year = Number(since.slice(0, 4));
  let month = Number(since.slice(5, 7));
  const lastKey = Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7));
  while (year * 12 + month <= lastKey) {
    months.push({ year, month, count: 1 });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

// The month a running month period is: "this month" in its words.
export const isThisMonth = (period: Period, today: string): boolean =>
  period.kind === "month" && period.year === Number(today.slice(0, 4)) && period.month === Number(today.slice(5, 7));

// "YYYY-MM" of a month period, else null.
export const monthKeyOf = (period: Period): string | null => (period.kind === "month" ? `${period.year}-${String(period.month).padStart(2, "0")}` : null);

// The month before a "YYYY-MM" month.
export function previousMonth(key: string): string {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

// The busiest bar: the first of the highest, or null when all are empty.
export function busiest<T extends { count: number }>(points: T[]): T | null {
  return points.reduce<T | null>((best, point) => (point.count > (best?.count ?? 0) ? point : best), null);
}

// The days a period spans, both ends counted.
export function spanDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

// The period as the reports' query string: "from=…&to=…", cut at today
// (the API would cut it too; the same text keeps one cache key).
export function rangeQueryOf(period: Period, today: string): string {
  const { from, to } = periodDays(period);
  const end = to > today ? today : to;
  return new URLSearchParams({ from: from > end ? end : from, to: end }).toString();
}

// Up to 62 days the charts draw a bar a day; a year, or more days, a bar a
// month.
export function isMonthly(period: Period, today: string): boolean {
  if (period.kind === "year") return true;
  const { from, to } = periodDays(period);
  const end = to > today ? today : to;
  return spanDays(from > end ? end : from, end) > 62;
}
