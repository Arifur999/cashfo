// The Income & Expense pages' arithmetic (Overview, Budget Planning), kept
// pure so it is tested apart from the pages.

export type Params = Record<string, string | string[] | undefined>;

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

// Overview's period: a month (?month=&year=, this month when left out), a
// whole year (?period=year&year=) or the reader's own days (?from=&to=).
export type Period = { kind: "month"; month: number; year: number } | { kind: "year"; year: number } | { kind: "custom"; from: string; to: string };

const isYear = (value: unknown): value is string => typeof value === "string" && /^\d{4}$/.test(value) && Number(value) >= 2000 && Number(value) <= 2100;

// A real calendar day written YYYY-MM-DD.
export function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// The period the address asks for, or null when it isn't one.
export function readPeriod(params: Params, current: { month: number; year: number }): Period | null {
  if (params.from !== undefined || params.to !== undefined) {
    return isDay(params.from) && isDay(params.to) && params.from <= params.to ? { kind: "custom", from: params.from, to: params.to } : null;
  }
  if (params.period === "year") return isYear(params.year) ? { kind: "year", year: Number(params.year) } : null;
  if (params.period !== undefined) return null;
  const month = readMonth(params, current);
  return month && { kind: "month", ...month };
}

// The period's first and last day, as the API's date filters take them.
export function periodRange(period: Period): { dateFrom: string; dateTo: string } {
  if (period.kind === "month") return monthRange(period.year, period.month);
  if (period.kind === "year") return { dateFrom: `${period.year}-01-01`, dateTo: `${period.year}-12-31` };
  return { dateFrom: period.from, dateTo: period.to };
}

// The page's address for a period; this month is the bare page.
export function periodHref(pathname: string, period: Period, current: { month: number; year: number }): string {
  const query = new URLSearchParams();
  if (period.kind === "year") {
    query.set("period", "year");
    query.set("year", String(period.year));
  } else if (period.kind === "custom") {
    query.set("from", period.from);
    query.set("to", period.to);
  } else if (period.month !== current.month || period.year !== current.year) {
    query.set("month", String(period.month));
    query.set("year", String(period.year));
  }
  const text = query.toString();
  return text ? `${pathname}?${text}` : pathname;
}

// A donut's conic-gradient: each slice its share of the total, in order;
// what the list leaves out (the API sends the top ten) is one "other" slice,
// so the ring always closes. Nothing at all is one plain ring.
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
