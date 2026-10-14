import type { CategoryBreakdown, IncomeVsSavingsPoint, LoanDashboardRow } from "./api";

// The figures Home derives from what the pages already fetch. Pure, so the
// page can compute them on the server and the tests can pin them down.

// How much the balance grew this month, as a share of where it stood at the
// start: the month's net flow against (balance − net flow). null when there
// is no starting balance to compare with.
export function balanceChangePercent(balance: number, netFlow: number): number | null {
  const start = balance - netFlow;
  if (start <= 0) return null;
  return Math.round((netFlow / start) * 1000) / 10;
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

// Where this month's kept amount stands among the last months: the best of
// them, or the latest month that beat it.
export function bestMonthNote(points: IncomeVsSavingsPoint[]): { best: true } | { best: false; beatenBy: string } | null {
  if (points.length < 2) return null;
  const current = points[points.length - 1];
  const currentSaved = Number(current.savings);
  const better = [...points.slice(0, -1)].reverse().find((p) => Number(p.savings) > currentSaved);
  return better ? { best: false, beatenBy: better.month } : { best: true };
}

// Days left in the month of a "YYYY-MM-DD" day, counting today.
export function daysLeftInMonth(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return last - date + 1;
}
