// The Income & Expense pages' arithmetic (Overview, Budget Planning), kept
// pure so it is tested apart from the pages. Their period is the report
// pages' one (lib/customer/period.ts).
import type { CategoryBreakdownRow } from "@/lib/customer/api";
import { categoryLabel } from "@/lib/customer/transactionRows";
import type { Translate } from "@/lib/i18n/message";
import { type Params, type PickedPeriod, periodHref, type YearMonth } from "@/lib/customer/period";

export type { Params };

// A month from the address (?month=10&year=2026), or null when it isn't one.
export function readMonth(params: Params, fallback: { month: number; year: number }): { month: number; year: number } | null {
  const month = typeof params.month === "string" ? params.month : String(fallback.month);
  const year = typeof params.year === "string" ? params.year : String(fallback.year);
  if (!/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  const m = Number(month);
  const y = Number(year);
  return m >= 1 && m <= 12 && y >= 2000 && y <= 2100 ? { month: m, year: y } : null;
}

const pad = (n: number) => String(n).padStart(2, "0");
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// A month's first and last day, as the API's date filters take them.
export function monthRange(year: number, month: number): { dateFrom: string; dateTo: string } {
  return { dateFrom: `${year}-${pad(month)}-01`, dateTo: `${year}-${pad(month)}-${pad(lastDayOf(year, month))}` };
}

// The same page for another month, the rest of its address kept.
export function monthHref(pathname: string, params: Params, month: number, year: number, current: { month: number; year: number }): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || key === "month" || key === "year" || key === "page") continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  if (month !== current.month || year !== current.year) {
    query.set("month", String(month));
    query.set("year", String(year));
  }
  const text = query.toString();
  return text ? `${pathname}?${text}` : pathname;
}

// A list page for a period: this month (its own) written as nothing, all
// time as ?period=all (the shared periodHref writes only real periods).
export function listPeriodHref(pathname: string, params: Params, period: PickedPeriod, current: YearMonth): string {
  const href = periodHref(pathname, params, period, { kind: "month", ...current });
  return period.kind === "all" ? `${href}${href.includes("?") ? "&" : "?"}period=all` : href;
}

// Transactions for a period (the page's own, this month, written as
// nothing), of one kind, one category or the money with none.
export function transactionsHref(period: PickedPeriod, current: YearMonth, filter: { type?: "INCOME" | "EXPENSE"; categoryId?: string; uncategorised?: boolean } = {}): string {
  const params: Params = {
    ...(filter.type && { type: filter.type }),
    ...(filter.categoryId && { categoryId: filter.categoryId }),
    ...(filter.uncategorised && { uncategorised: "1" }),
  };
  return listPeriodHref("/transactions", params, period, current);
}

// Budget Planning at the period's month (it plans one month at a time);
// this month for a year or the reader's own days.
export const budgetHref = (period: PickedPeriod): string => (period.kind === "month" ? `/categories?month=${period.month}&year=${period.year}` : "/categories");

// A share to one decimal, "70.5", or "70" when it is whole.
export const oneDecimal = (value: number): string => String(Math.round(value * 10) / 10);

// A category's name in the reader's language: the money with none is
// "Uncategorised"; the app's own names have their Bangla, a customer's own
// name stays as written (transactionRows' categoryLabel).
export const categoryName = (row: Pick<CategoryBreakdownRow, "name" | "uncategorised">, t: Translate): string => categoryLabel(row.uncategorised ? "Uncategorised" : row.name, t);

// A donut's conic-gradient: each slice its share of the total, in order;
// whatever the slices leave of the total is one "other" slice, so the ring
// always closes. Nothing at all is one plain ring.
export function donutGradient(slices: { amount: number; color: string }[], total: number, other: string, empty: string): string {
  if (!(total > 0)) return empty;
  const stops: string[] = [];
  let start = 0;
  for (const slice of slices) {
    const end = Math.min(100, start + (Math.max(0, slice.amount) / total) * 100);
    stops.push(`${slice.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
    start = end;
  }
  if (start < 99.99) stops.push(`${other} ${start.toFixed(2)}% 100%`);
  return `conic-gradient(${stops.join(", ")})`;
}

// What was kept of the month's income, in percent (one decimal); null when
// nothing came in, as a rate of nothing means nothing.
export function savingsRate(income: number, expense: number): number | null {
  if (income <= 0) return null;
  return Math.round(((income - expense) / income) * 1000) / 10;
}

// Budget Planning's search: a plan matches when every word typed is in its
// month's name or one of its amounts. Digits match in Latin or Bangla, with
// or without the thousands commas ("1,20,000", "120000", "১২০০০০").
export function planMatches(query: string, texts: string[]): boolean {
  const norm = (text: string) =>
    text
      .replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6))
      .replace(/(\d),(?=\d)/g, "$1")
      .toLowerCase();
  const haystack = norm(texts.join(" "));
  return norm(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

// How far the month's spending is into its budget.
export type BudgetState = "ON_TRACK" | "NEAR_LIMIT" | "OVER";

export function budgetState(percent: number): BudgetState {
  if (percent > 100) return "OVER";
  if (percent >= 80) return "NEAR_LIMIT";
  return "ON_TRACK";
}

// A whole percentage of a target (0 when there is none).
export function percentOf(value: number, target: number | null): number {
  if (!target || target <= 0) return 0;
  return Math.round((value / target) * 100);
}

// Days still to come in the month, today included; 0 for a past month, the
// whole month for one still ahead.
export function daysLeft(year: number, month: number, today: string): number {
  const [ty, tm, td] = today.split("-").map(Number);
  const last = lastDayOf(year, month);
  if (year < ty || (year === ty && month < tm)) return 0;
  if (year > ty || month > tm) return last;
  return last - td + 1;
}
