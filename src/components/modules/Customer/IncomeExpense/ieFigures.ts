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

// What was kept of the month's income, in percent (one decimal); null when
// nothing came in, as a rate of nothing means nothing.
export function savingsRate(income: number, expense: number): number | null {
  if (income <= 0) return null;
  return Math.round(((income - expense) / income) * 1000) / 10;
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
