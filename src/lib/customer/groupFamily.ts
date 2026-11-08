import type { GroupContribution, GroupExpense, GroupExpenseCategoryOption, GroupMember, GroupMonthlyBudget, GroupSettings, GroupSettlementMemberRow, GroupSettlementRecord } from "./api";
import { groupMonthOf, monthRangeOf, shiftMonth } from "./groupDisplay";

// The v7 family model, worked out from what the API returns: accountants
// and the main one who settles with everyone, each member's cost share,
// the settlement cards ("Has to pay Khaled", "✓ Paid to Khaled"), and the
// budget by month. Pure, so the tests and the pages share it.

const paisa = (value: number | string) => Math.round(Number(value) * 100);
const even = (value: number) => Math.abs(value) < 0.005;

export const isAccountant = (member: Pick<GroupMember, "role">): boolean => member.role === "ACCOUNTANT";

// The group's active accountants, in the API's order (the owner first).
export const accountantsOf = (members: GroupMember[]): GroupMember[] => members.filter((member) => member.status === "ACTIVE" && isAccountant(member));

// The accountant everyone settles with: the cash holder, or else the first
// accountant.
export function mainAccountantId(settings: Pick<GroupSettings, "cashHolderMemberId">, members: GroupMember[]): string | null {
  return settings.cashHolderMemberId ?? accountantsOf(members)[0]?.id ?? null;
}

// Each active member's percent of the costs shared by the cost split:
// 100 / members when it is equal, their own percent when it is custom.
export function costShares(members: GroupMember[], settings: Pick<GroupSettings, "costSplit">): Record<string, number> {
  const active = members.filter((member) => member.status === "ACTIVE");
  if (settings.costSplit !== "CUSTOM") return Object.fromEntries(active.map((member) => [member.id, active.length > 0 ? 100 / active.length : 0]));
  return Object.fromEntries(active.map((member) => [member.id, Number(member.costPercent ?? 0)]));
}

// Percents add up to 100 when they are within half a hundredth of it.
export const addsUpToHundred = (percents: number[]): boolean => Math.abs(percents.reduce((sum, value) => sum + Math.round(value * 100), 0) - 10000) <= 5;

// One settle-up: the payer's SETTLE in and the receiver's SETTLE out.
export interface SettlePair {
  settleGroupId: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;
  // Who recorded it (an Editor undoes only their own).
  createdByUserId?: string | null;
}

export function settlePairs(contributions: GroupContribution[]): SettlePair[] {
  const groups = new Map<string, GroupContribution[]>();
  for (const row of contributions) {
    if (row.kind !== "SETTLE" || !row.settleGroupId) continue;
    groups.set(row.settleGroupId, [...(groups.get(row.settleGroupId) ?? []), row]);
  }
  const pairs: SettlePair[] = [];
  for (const [settleGroupId, rows] of groups) {
    const from = rows.find((row) => Number(row.amount) > 0);
    const to = rows.find((row) => Number(row.amount) < 0);
    if (from && to) pairs.push({ settleGroupId, fromId: from.groupMemberId, toId: to.groupMemberId, amount: Number(from.amount), date: from.date.slice(0, 10), createdByUserId: from.createdByUserId ?? null });
  }
  return pairs;
}

// What each member's settle-ups added to their balance.
export function settleSums(contributions: GroupContribution[]): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const row of contributions) if (row.kind === "SETTLE") sums[row.groupMemberId] = (paisa(sums[row.groupMemberId] ?? 0) + paisa(row.amount)) / 100;
  return sums;
}

export type SettleState =
  // The accountant everyone settles with: their own balance stays with them.
  | { kind: "holder" }
  // Owes the accountant / is owed by them.
  | { kind: "pays"; amount: number }
  | { kind: "gets"; amount: number }
  // Settled by a payment through the accountant (Undo removes it).
  | { kind: "paid"; pair: SettlePair }
  | { kind: "received"; pair: SettlePair }
  // Nothing to settle.
  | { kind: "even" };

export interface SettleCard {
  memberId: string;
  name: string;
  // The balance before any settle-up (what the card says they owe or get).
  before: number;
  // After the settle-ups so far.
  after: number;
  share: number;
  gave: number;
  state: SettleState;
}

// Each member's card on Settlement: everyone settles with the accountant,
// whose own balance stays with them.
export function settlementCards(rows: GroupSettlementMemberRow[], contributions: GroupContribution[], holderId: string | null): SettleCard[] {
  const sums = settleSums(contributions);
  const pairs = settlePairs(contributions);
  return rows.map((row) => {
    const after = Number(row.balance);
    const before = (paisa(after) - paisa(sums[row.groupMemberId] ?? 0)) / 100;
    const base = { memberId: row.groupMemberId, name: row.name, before, after, share: Number(row.share), gave: Number(row.contributed) - (sums[row.groupMemberId] ?? 0) + Number(row.pocketPaid) };
    if (row.groupMemberId === holderId) return { ...base, state: { kind: "holder" } as const };
    const pair = holderId ? pairs.find((p) => (p.fromId === row.groupMemberId && p.toId === holderId) || (p.toId === row.groupMemberId && p.fromId === holderId)) : undefined;
    if (even(after)) {
      if (pair) return { ...base, state: pair.fromId === row.groupMemberId ? ({ kind: "paid", pair } as const) : ({ kind: "received", pair } as const) };
      return { ...base, state: { kind: "even" } as const };
    }
    return { ...base, state: after < 0 ? ({ kind: "pays", amount: -after } as const) : ({ kind: "gets", amount: after } as const) };
  });
}

// "{done} of {n} payments done": the settle-ups made and those still open.
export function settleProgress(cards: SettleCard[]): { done: number; total: number } {
  const done = cards.filter((card) => card.state.kind === "paid" || card.state.kind === "received").length;
  const open = cards.filter((card) => card.state.kind === "pays" || card.state.kind === "gets").length;
  return { done, total: done + open };
}

// ---- Spending and budgets ----

// A month's budget, if one was set.
export function budgetOf(budgets: GroupMonthlyBudget[], key: string): number | null {
  const [year, month] = key.split("-").map(Number);
  const found = budgets.find((budget) => budget.year === year && budget.month === month);
  return found ? Number(found.budgetAmount) : null;
}

// Spending in each group month, by key.
export function spendByMonthKey(expenses: Pick<GroupExpense, "date" | "amount">[], startDay = 1): Record<string, number> {
  const out: Record<string, number> = {};
  for (const expense of expenses) {
    const key = groupMonthOf(expense.date.slice(0, 10), startDay);
    out[key] = (paisa(out[key] ?? 0) + paisa(expense.amount)) / 100;
  }
  return out;
}

export type MonthResult = { kind: "over"; amount: number } | { kind: "left"; amount: number } | { kind: "running" } | { kind: "none" };

export interface BudgetMonth {
  key: string;
  budget: number | null;
  spent: number;
  result: MonthResult;
  current: boolean;
  future: boolean;
}

// One row per month: the budget, what was spent and how it ended. The
// running month without a budget is "Running"; a past month without one
// has no result.
export function budgetMonths(keys: string[], budgets: GroupMonthlyBudget[], spent: Record<string, number>, currentKey: string): BudgetMonth[] {
  return keys.map((key) => {
    const budget = budgetOf(budgets, key);
    const amount = spent[key] ?? 0;
    const current = key === currentKey;
    const future = key > currentKey;
    const result: MonthResult = budget === null ? (current ? { kind: "running" } : { kind: "none" }) : amount > budget ? { kind: "over", amount: amount - budget } : { kind: "left", amount: budget - amount };
    return { key, budget, spent: amount, result, current, future };
  });
}

// The budget figures over some months: the budgets set, what was spent in
// those months, and the share used. Months without a budget are left out.
export function budgetTotals(months: BudgetMonth[]): { budget: number; spent: number; used: number | null; withBudget: number; over: number } {
  const set = months.filter((month) => month.budget !== null && !month.future);
  const budget = set.reduce((sum, month) => sum + paisa(month.budget ?? 0), 0) / 100;
  const spent = set.reduce((sum, month) => sum + paisa(month.spent), 0) / 100;
  return { budget, spent, used: budget > 0 ? (spent / budget) * 100 : null, withBudget: set.length, over: set.filter((month) => month.spent > (month.budget ?? 0)).length };
}

// The Monthly budget page's months: next month back to the group's first.
export function budgetPageMonths(currentKey: string, firstKey: string): string[] {
  const keys: string[] = [];
  for (let key = shiftMonth(currentKey, 1); key >= firstKey && keys.length < 120; key = shiftMonth(key, -1)) keys.push(key);
  return keys;
}

// The group's first month with anything in it (a member, a budget, an
// expense), or the current one.
export function firstMonthOf(currentKey: string, members: Pick<GroupMember, "createdAt" | "joinedOn">[], budgets: GroupMonthlyBudget[], expenses: Pick<GroupExpense, "date">[], startDay = 1): string {
  const keys = [
    currentKey,
    ...members.map((member) => groupMonthOf((member.joinedOn ?? member.createdAt).slice(0, 10), startDay)),
    ...budgets.map((budget) => `${budget.year}-${String(budget.month).padStart(2, "0")}`),
    ...expenses.map((expense) => groupMonthOf(expense.date.slice(0, 10), startDay)),
  ];
  return keys.sort()[0];
}

export interface CategoryRow {
  name: string;
  option: GroupExpenseCategoryOption | undefined;
  amount: number;
  count: number;
  // Of the period's spending, 0-100.
  share: number;
}

// Every category with the period's spending in it, highest first; a
// category with none still shows (৳ 0), and a name only old expenses use
// too. Hidden categories show only when spent in.
export function categoryRows(expenses: Pick<GroupExpense, "category" | "amount">[], categories: GroupExpenseCategoryOption[]): CategoryRow[] {
  const totals = new Map<string, { amount: number; count: number }>();
  for (const expense of expenses) {
    const row = totals.get(expense.category) ?? { amount: 0, count: 0 };
    totals.set(expense.category, { amount: (paisa(row.amount) + paisa(expense.amount)) / 100, count: row.count + 1 });
  }
  const names = [...new Set([...categories.filter((c) => !c.hidden || totals.has(c.name)).map((c) => c.name), ...totals.keys()])];
  const all = [...totals.values()].reduce((sum, row) => sum + paisa(row.amount), 0) / 100;
  return names
    .map((name) => {
      const row = totals.get(name) ?? { amount: 0, count: 0 };
      return { name, option: categories.find((c) => c.name === name), amount: row.amount, count: row.count, share: all > 0 ? (row.amount / all) * 100 : 0 };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

// The months a year's chart and table cover: January to December.
export const yearMonths = (year: string): string[] => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);

// A closed month's record, if any covers this group month.
export function closedFor(history: Pick<GroupSettlementRecord, "periodStart" | "periodEnd">[], key: string, startDay = 1): boolean {
  const { from, to } = monthRangeOf(key, startDay);
  return history.some((record) => record.periodStart.slice(0, 10) <= from && record.periodEnd.slice(0, 10) >= to);
}

// The last day of the group month a day is in ("inactive from next month").
export const monthEndOf = (day: string, startDay = 1): string => monthRangeOf(groupMonthOf(day, startDay), startDay).to;
