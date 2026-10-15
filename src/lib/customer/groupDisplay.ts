import type { GroupContribution, GroupExpense, GroupMember, GroupMonthlyBudget, GroupSettlementMemberRow, GroupSettlementRecord, GroupSettlementResult } from "./api";

// The figures a group page derives from what the API already returns:
// the month's range and whether it is closed, cash in hand, who pays
// whom, the budget bar, the spend by category and by month. Pure, so the
// server page and the tests can both use them.

export const GROUP_TABS = ["dashboard", "members", "contributions", "expenses", "settlement", "settings"] as const;
export type GroupTab = (typeof GROUP_TABS)[number];

export const GROUP_TAB_LABELS: Record<GroupTab, string> = {
  dashboard: "Dashboard",
  members: "Members",
  contributions: "Contributions",
  expenses: "Expenses",
  settlement: "Settlement",
  settings: "Settings",
};

// The old ?tab=category lived in the sidebar; categories now sit in Settings.
export function groupTabFrom(value: unknown): GroupTab {
  if (value === "category") return "settings";
  return typeof value === "string" && (GROUP_TABS as readonly string[]).includes(value) ? (value as GroupTab) : "dashboard";
}

const pad = (n: number) => String(n).padStart(2, "0");
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

export interface MonthRange {
  // "YYYY-MM"
  key: string;
  year: number;
  month: number;
  from: string;
  to: string;
}

// A "YYYY-MM" key, or today's month when the value is not one.
export function monthKeyFrom(value: unknown, today: string): string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : today.slice(0, 7);
}

export function monthRangeOf(key: string): MonthRange {
  const [year, month] = key.split("-").map(Number);
  return { key, year, month, from: `${key}-01`, to: `${key}-${pad(lastDayOf(year, month))}` };
}

// The month `offset` months from `key` (negative for earlier).
export function shiftMonth(key: string, offset: number): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

// The months a picker offers: from the earliest entry (or a year back) to
// this month, newest first.
export function monthChoices(today: string, earliest?: string | null): string[] {
  const current = today.slice(0, 7);
  const floor = earliest ? earliest.slice(0, 7) : shiftMonth(current, -11);
  const keys: string[] = [];
  for (let key = current; key >= floor && keys.length < 36; key = shiftMonth(key, -1)) keys.push(key);
  return keys;
}

// A month is closed once a settlement record covers it.
export function closedRecordFor(history: GroupSettlementRecord[], range: MonthRange): GroupSettlementRecord | null {
  return history.find((record) => record.periodStart.slice(0, 10) <= range.from && record.periodEnd.slice(0, 10) >= range.to) ?? null;
}

// Whether a day falls inside a closed month: an entry there needs a
// confirm before it changes.
export function isDayClosed(history: GroupSettlementRecord[], day: string): boolean {
  const d = day.slice(0, 10);
  return history.some((record) => record.periodStart.slice(0, 10) <= d && record.periodEnd.slice(0, 10) >= d);
}

// Contributions − returns − expenses: what the fund should be holding for
// the period, which is also every balance added up.
export function cashInHand(settlement: GroupSettlementResult): number {
  return Math.round(settlement.members.reduce((sum, row) => sum + Number(row.balance), 0) * 100) / 100;
}

export interface ContributionTotals {
  deposited: number;
  returned: number;
  net: number;
}

// Deposits are positive contributions, returns negative.
export function contributionTotals(contributions: GroupContribution[]): ContributionTotals {
  let deposited = 0;
  let returned = 0;
  for (const row of contributions) {
    const amount = Number(row.amount);
    if (amount >= 0) deposited += amount;
    else returned += -amount;
  }
  return { deposited, returned, net: deposited - returned };
}

// What each member paid in, net, biggest first.
export function contributionsByMember(contributions: GroupContribution[], members: GroupMember[]): { member: GroupMember; amount: number }[] {
  const byId = new Map<string, number>();
  for (const row of contributions) byId.set(row.groupMemberId, (byId.get(row.groupMemberId) ?? 0) + Number(row.amount));
  return members
    .filter((member) => byId.has(member.id))
    .map((member) => ({ member, amount: byId.get(member.id) ?? 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export interface Transfer {
  fromId: string;
  toId: string;
  amount: number;
}

// The fewest payments that make everyone even: the biggest debtor pays
// the biggest creditor, and so on. Amounts are kept to the paisa.
export function whoPaysWhom(rows: GroupSettlementMemberRow[]): Transfer[] {
  const debtors = rows.map((r) => ({ id: r.groupMemberId, left: -Number(r.balance) })).filter((r) => r.left > 0.004).sort((a, b) => b.left - a.left);
  const creditors = rows.map((r) => ({ id: r.groupMemberId, left: Number(r.balance) })).filter((r) => r.left > 0.004).sort((a, b) => b.left - a.left);
  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.round(Math.min(debtors[i].left, creditors[j].left) * 100) / 100;
    transfers.push({ fromId: debtors[i].id, toId: creditors[j].id, amount });
    debtors[i].left -= amount;
    creditors[j].left -= amount;
    if (debtors[i].left <= 0.004) i++;
    if (creditors[j].left <= 0.004) j++;
  }
  return transfers;
}

export type BudgetTone = "ok" | "warning" | "over";

export interface BudgetStatus {
  budget: number;
  spent: number;
  percent: number;
  // What is left, negative when over.
  left: number;
  tone: BudgetTone;
}

export function budgetFor(budgets: GroupMonthlyBudget[], range: MonthRange): GroupMonthlyBudget | null {
  return budgets.find((b) => b.year === range.year && b.month === range.month) ?? null;
}

// Amber from 90% used, red once over.
export function budgetStatus(budget: number, spent: number): BudgetStatus {
  const percent = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  return { budget, spent, percent, left: budget - spent, tone: spent > budget ? "over" : percent >= 90 ? "warning" : "ok" };
}

export interface CategorySpend {
  name: string;
  amount: number;
  // Share of the total, one decimal.
  share: number;
}

export function spendByCategory(expenses: GroupExpense[]): CategorySpend[] {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const byName = new Map<string, number>();
  for (const e of expenses) byName.set(e.category, (byName.get(e.category) ?? 0) + Number(e.amount));
  return [...byName]
    .map(([name, amount]) => ({ name, amount, share: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

// What was spent in each of the given months.
export function spendByMonth(expenses: GroupExpense[], months: string[]): { month: string; amount: number }[] {
  const byMonth = new Map(months.map((m) => [m, 0]));
  for (const e of expenses) {
    const key = e.date.slice(0, 7);
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) ?? 0) + Number(e.amount));
  }
  return months.map((month) => ({ month, amount: byMonth.get(month) ?? 0 }));
}

// Only the entries dated inside the month.
export function inMonth<T extends { date: string }>(rows: T[], range: MonthRange): T[] {
  return rows.filter((row) => {
    const day = row.date.slice(0, 10);
    return day >= range.from && day <= range.to;
  });
}

// A new group has nothing recorded yet: the page shows the setup steps.
export function needsSetup(contributions: GroupContribution[], expenses: GroupExpense[]): boolean {
  return contributions.length === 0 && expenses.length === 0;
}

// "Jan 2025" from an ISO timestamp, for "member since".
export function memberSince(member: GroupMember): string {
  return member.createdAt.slice(0, 7);
}

// The budget bar and its figure, by status.
export const BUDGET_TONE_BAR: Record<BudgetTone, string> = { ok: "bg-emerald", warning: "bg-warning-fill", over: "bg-expense-fill" };
export const BUDGET_TONE_TEXT: Record<BudgetTone, string> = { ok: "text-ink", warning: "text-warning", over: "text-expense" };
