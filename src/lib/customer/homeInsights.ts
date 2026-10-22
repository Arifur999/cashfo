import type { CategoryBreakdown, LoanDashboardRow, MonthlyBreakdown, SavingsGoal } from "./api";
import { goalTotals } from "./savingsDisplay";

// The figures Home derives from what the pages already fetch. Pure, so the
// page can compute them on the server and the tests can pin them down.

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
// Day 0 of the next month is the last day of this one (month is 1-12).
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const partsOf = (day: string) => day.split("-").map(Number) as [number, number, number];

// How much the wallets grew this month, as a share of what they held when
// it began: (balance − start) / start. The start is the wallets' own
// balance brought forward to the 1st, so money that moved any way at all
// (into a savings goal, a loan, an asset) counts, not only income and
// expense. null when there is no starting balance to compare with.
export function balanceChangePercent(balance: number, start: number | null): number | null {
  if (start === null || !(start > 0)) return null;
  return Math.round(((balance - start) / start) * 1000) / 10;
}

export interface TopShare {
  name: string;
  amount: number;
  percent: number;
}

// The biggest category of a breakdown and its share of the total.
export function topShare(breakdown: CategoryBreakdown): TopShare | null {
  const total = Number(breakdown.total);
  if (!(total > 0) || breakdown.categories.length === 0) return null;
  const top = [...breakdown.categories].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
  return { name: top.name, amount: Number(top.amount), percent: Math.round((Number(top.amount) / total) * 100) };
}

// How a category's amount this period compares with the last: positive
// means more was spent (or earned) now.
export function categoryDelta(current: CategoryBreakdown, previous: CategoryBreakdown, name: string): number {
  const now = Number(current.categories.find((c) => c.name === name)?.amount ?? 0);
  const before = Number(previous.categories.find((c) => c.name === name)?.amount ?? 0);
  return Math.round((now - before) * 100) / 100;
}

// One month of a monthly breakdown, shaped like a category breakdown so the
// helpers above read it: every category with money that month, and the
// month's total. An index outside the months reads as an empty month.
export function monthColumn(breakdown: MonthlyBreakdown, index: number): CategoryBreakdown {
  const total = Number(breakdown.totals[index] ?? 0);
  const categories = breakdown.rows
    .map((row) => ({ name: row.name, amount: Number(row.amounts[index] ?? 0), color: row.color }))
    .filter((row) => row.amount > 0)
    .map((row) => ({ name: row.name, amount: row.amount.toFixed(2), percent: total > 0 ? Math.round((row.amount / total) * 100) : 0, color: row.color }));
  return { type: breakdown.type, total: total.toFixed(2), categories };
}

// Who the loan balances are with: how many people owe you, how many you owe.
export function loanCounts(rows: LoanDashboardRow[]): { oweYou: number; youOwe: number } {
  return {
    oweYou: rows.filter((row) => row.direction === "PAWNA").length,
    youOwe: rows.filter((row) => row.direction === "DENA").length,
  };
}

// Savings rate: what share of the month's income was kept.
export function savingsRate(income: number, expense: number): number | null {
  if (!(income > 0)) return null;
  return Math.max(0, Math.round(((income - expense) / income) * 100));
}

// Every savings goal together, the way Savings › Goals adds them up (its
// goalTotals): what is saved, the targets, how far along (0–100) and how
// many goals. A withdrawn goal is paid out and done, so neither it nor its
// target counts as still to save.
export function savingsTotals(goals: Pick<SavingsGoal, "status" | "currentAmount" | "targetAmount">[]): { saved: number; target: number; progress: number; count: number } {
  const { saved, target, percent, count } = goalTotals(goals);
  return { saved, target, progress: percent, count };
}

// What the wallets held when a day ended, from wallets-overview?asOf: each
// wallet's balanceAsOf added up. null when there are none, or when any of
// them lacks one (a backend from before asOf), so the caller can read it
// another way.
export function balanceAsOfTotal(wallets: { balanceAsOf?: string | null }[]): number | null {
  if (wallets.length === 0) return null;
  let total = 0;
  for (const wallet of wallets) {
    if (wallet.balanceAsOf === undefined || wallet.balanceAsOf === null) return null;
    const value = Number(wallet.balanceAsOf);
    if (!Number.isFinite(value)) return null;
    total += value;
  }
  return total;
}

// The axis of "Income and what you kept": its top and the rule halfway up,
// the top rounded up to a clean figure (85,000 → 1,00,000; 3,20,000 →
// 4,00,000) so the labels read as whole lakhs or thousands. Never below 2,
// so the halfway label is a whole taka of its own rather than a second "1",
// and 10 above that, so it is never "2.5" rounded to "3". null when there
// is nothing to plot (every month 0): no axis is drawn then.
export function chartAxis(top: number): { max: number; mid: number } | null {
  if (!(top > 0) || !Number.isFinite(top)) return null;
  if (top <= 2) return { max: 2, mid: 1 };
  if (top <= 10) return { max: 10, mid: 5 };
  const magnitude = 10 ** Math.floor(Math.log10(top));
  const unit = top / magnitude;
  const step = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
  const max = step * magnitude;
  return { max, mid: max / 2 };
}

// Where this month's kept amount stands among the months before it: the
// best of them, or the latest month that kept more ("YYYY-MM"). Only a
// month that kept something has a place to stand.
export function bestMonthNote(points: { month: string; kept: number }[]): { best: true } | { best: false; beatenBy: string } | null {
  if (points.length < 2) return null;
  const current = points[points.length - 1];
  if (!(current.kept > 0)) return null;
  const better = [...points.slice(0, -1)].reverse().find((p) => p.kept > current.kept);
  return better ? { best: false, beatenBy: better.month } : { best: true };
}

// The last day of the month before a "YYYY-MM-DD" day's: the day whose
// close the hero's trend chip compares with (2026-10-21 → 2026-09-30).
export function previousMonthEnd(day: string): string {
  const [year, month] = partsOf(day);
  const lastYear = month === 1 ? year - 1 : year;
  const lastMonth = month === 1 ? 12 : month - 1;
  return ymd(lastYear, lastMonth, lastDayOf(lastYear, lastMonth));
}

// Days left in the month of a "YYYY-MM-DD" day, counting today.
export function daysLeftInMonth(day: string): number {
  const [year, month, date] = partsOf(day);
  const last = lastDayOf(year, month);
  return last - date + 1;
}

// The first day of the month `count - 1` months before a "YYYY-MM-DD" day:
// the start of a `count`-month window that ends with the day's month.
export function windowStart(day: string, count: number): string {
  const [year, month] = partsOf(day);
  const start = new Date(Date.UTC(year, month - count, 1));
  return ymd(start.getUTCFullYear(), start.getUTCMonth() + 1, 1);
}

// The same stretch of last month as this month so far: the 1st to the same
// day, cut short where last month was shorter (31 March → 1–28 February).
// What "this month so far" is fairly compared with.
export function sameDaysLastMonth(day: string): { dateFrom: string; dateTo: string } {
  const [year, month, date] = partsOf(day);
  const lastYear = month === 1 ? year - 1 : year;
  const lastMonth = month === 1 ? 12 : month - 1;
  return { dateFrom: ymd(lastYear, lastMonth, 1), dateTo: ymd(lastYear, lastMonth, Math.min(date, lastDayOf(lastYear, lastMonth))) };
}

interface RecordsSoFar {
  // Income and expense of the months before this one, oldest first.
  earlier: { income: number; expense: number }[];
  // The newest transactions' days ("YYYY-MM-DD"), and how many there are
  // in all.
  recentDays: string[];
  total: number;
  // "YYYY-MM-DD" of this month's 1st.
  monthStart: string;
}

// Whether this month is the first with anything recorded: nothing came in
// or went out in the months before, and every transaction there is falls
// in this month. Only said when it is certain; otherwise the caller says
// what it does know ("No income in September").
export function isFirstMonthOnRecord({ earlier, recentDays, total, monthStart }: RecordsSoFar): boolean {
  if (earlier.some((month) => month.income > 0 || month.expense > 0)) return false;
  return total <= recentDays.length && recentDays.every((day) => day >= monthStart);
}
