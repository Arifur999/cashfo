// The figures Budget and Income sources work out from what the API reads
// them: plain functions, so the pages and their tests agree.
import type { MonthlyBreakdown } from "@/lib/customer/api";

const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (year: number, month: number) => `${year}-${pad(month)}`;
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const cents = (value: number) => Math.round(value * 100) / 100;

// A ?month= / ?year= pair the budget API takes (months 1-12, years
// 2000-2100); anything else is no month at all.
export function readBudgetMonth(month: unknown, year: unknown): { month: number; year: number } | null {
  if (typeof month !== "string" || typeof year !== "string" || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  const m = Number(month);
  const y = Number(year);
  return m >= 1 && m <= 12 && y >= 2000 && y <= 2100 ? { month: m, year: y } : null;
}

// The same page without some of its query (a month it couldn't read).
export function hrefWithout(pathname: string, params: Record<string, string | string[] | undefined>, keys: string[]): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || keys.includes(key)) continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

// The first and last day of a month, as the list's date filters take them.
export function monthBounds(year: number, month: number): { dateFrom: string; dateTo: string } {
  return { dateFrom: `${monthKey(year, month)}-01`, dateTo: `${monthKey(year, month)}-${pad(lastDayOf(year, month))}` };
}

// What moved in the month beyond what the categories show: entries saved
// with no category, a deleted category's, a feature's own ("Asset Sale",
// "Referral Bonus"). Nothing when the month's real total isn't known.
export function outsideCategories(monthTotal: number | null, categorized: number): number {
  return monthTotal === null ? 0 : Math.max(0, cents(monthTotal - categorized));
}

// What the month's spending is measured against: the monthly budget, or
// when none is set, what the categories were given. The phone and desktop
// cards both go by this.
export function budgetReference(totalBudget: number | null, allocated: number): { amount: number; kind: "budget" | "categories" } | null {
  if (totalBudget !== null && totalBudget > 0) return { amount: totalBudget, kind: "budget" };
  return allocated > 0 ? { amount: allocated, kind: "categories" } : null;
}

// The months Income sources reads in one go: the month before the one on
// show (for "Growing fastest") through the end of that year as far as it
// has gone (for the year column), at most 13.
export function sourceHistoryRange(year: number, month: number, today: { year: number; month: number }): { dateFrom: string; dateTo: string } {
  const from = month === 1 ? { year: year - 1, month: 12 } : { year, month: 1 };
  const lastMonth = year < today.year ? 12 : year === today.year ? Math.max(month, today.month) : month;
  return { dateFrom: `${monthKey(from.year, from.month)}-01`, dateTo: monthBounds(year, lastMonth).dateTo };
}

// Per source: what came in the month before the one on show, and in its
// whole year so far. Every source is there, not the biggest ten.
export function sourceHistory(breakdown: MonthlyBreakdown, year: number, month: number): { lastMonth: Record<string, number>; thisYear: Record<string, number> } {
  const previous = month === 1 ? monthKey(year - 1, 12) : monthKey(year, month - 1);
  const previousIndex = breakdown.months.indexOf(previous);
  const lastMonth: Record<string, number> = {};
  const thisYear: Record<string, number> = {};
  for (const row of breakdown.rows) {
    const amounts = row.amounts.map(Number);
    if (previousIndex >= 0 && amounts[previousIndex] > 0) lastMonth[row.name] = amounts[previousIndex];
    const inYear = cents(breakdown.months.reduce((sum, key, index) => (key.startsWith(`${year}-`) ? sum + (amounts[index] ?? 0) : sum), 0));
    if (inYear > 0) thisYear[row.name] = inYear;
  }
  return { lastMonth, thisYear };
}

export interface Growth {
  name: string;
  before: number;
  now: number;
  percent: number;
}

// The source that grew the most since last month, by percent; null when
// none did (or there was nothing last month to grow from).
export function fastestGrowing(sources: { name: string; amount: number }[], lastMonth: Record<string, number>): Growth | null {
  const grown = sources
    .map((source) => ({ name: source.name, now: source.amount, before: lastMonth[source.name] ?? 0 }))
    .filter((g) => g.before > 0 && g.now > g.before)
    .map((g) => ({ ...g, percent: Math.round(((g.now - g.before) / g.before) * 100) }))
    .sort((a, b) => b.percent - a.percent);
  return grown[0] ?? null;
}

// Budget planning's two tabs. Expense lives at /categories; income at
// /categories?tab=income, so the breadcrumb and the menu stay on Budget
// Planning, or at /income-category when it was opened from the Income
// Category menu entry, which keeps that entry lit. Both keep the month.
export type BudgetTab = "expense" | "income";
export type BudgetPath = "/categories" | "/income-category";

export function budgetTabHref(tab: BudgetTab, path: BudgetPath, month: number, year: number): string {
  const query = new URLSearchParams();
  if (tab === "income" && path === "/categories") query.set("tab", "income");
  query.set("month", String(month));
  query.set("year", String(year));
  return `${tab === "income" && path === "/income-category" ? "/income-category" : "/categories"}?${query.toString()}`;
}

export interface IncomeShare {
  id: string;
  name: string;
  color: string | null;
  amount: number;
  // Of everything earned in the month, 0-100, unrounded.
  share: number;
}

// Each income category's part of what the month earned: its earnings over
// the total. Categories that earned nothing are left out of the bar.
export function incomeShares(categories: { id: string; name: string; color: string | null; spent: string }[], total: number): IncomeShare[] {
  return categories
    .map((category) => ({ id: category.id, name: category.name, color: category.color, amount: Number(category.spent) }))
    .filter((category) => category.amount > 0 && total > 0)
    .map((category) => ({ ...category, share: Math.min(100, (category.amount / total) * 100) }));
}
