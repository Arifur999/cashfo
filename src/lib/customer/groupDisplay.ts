import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { formatCurrency } from "./currency";
import type { FillValues } from "@/lib/i18n/fill";
import { type FormatLocale, numericDates } from "@/lib/i18n/formatPrefs";
import type { Translate } from "@/lib/i18n/message";
import type { GroupContribution, GroupExpense, GroupExpenseCategoryOption, GroupMember, GroupSplit, GroupMonthlyBudget, GroupSettlementMemberRow, GroupSettlementRecord, GroupSettlementResult } from "./api";

// The figures a group page derives from what the API already returns:
// the month's range and whether it is closed, cash in hand, who pays
// whom, the budget bar, the spend by category and by month. Pure, so the
// server page and the tests can both use them.

// A group's pages, in the v16 AppSidebar board's order. The board leaves
// Meals out; it is a working page for a mess (or a family counting meals),
// so it sits after Monthly budget.
export const GROUP_TABS = ["dashboard", "expenses", "settlement", "cashbook", "contributions", "budget", "meals", "members", "categories", "activity", "settings"] as const;
export type GroupTab = (typeof GROUP_TABS)[number];

// The pages a group shows: Meals only for a group that counts meals (the
// v16 boards share everything else in every kind of group).
export function groupTabsFor(mealsOn: boolean): GroupTab[] {
  return GROUP_TABS.filter((tab) => tab !== "meals" || mealsOn);
}

export const GROUP_TAB_LABELS: Record<GroupTab, string> = {
  dashboard: "Dashboard",
  contributions: "Contributions",
  expenses: "Expenses",
  cashbook: "Cash book",
  settlement: "Settlement",
  members: "Members",
  categories: "Categories",
  budget: "Monthly budget",
  meals: "Meals",
  activity: "Activity",
  settings: "Settings",
};

// A group page's address.
export const groupTabHref = (businessId: string, tab: GroupTab, extra?: Record<string, string>): string => {
  const query = new URLSearchParams({ tab, ...extra }).toString();
  return `/group-expenses/${businessId}?${query}`;
};

// The ways an expense can be shared, and their words.
export const SPLITS: GroupSplit[] = ["EQUAL", "SHARES", "MEALS", "EXACT"];
export const SPLIT_LABELS: Record<GroupSplit, string> = { EQUAL: "Equally", SHARES: "By shares", MEALS: "By meals", EXACT: "Exact amounts" };

// How an expense is shared, in a few words: "Equally · ÷ 3", "By shares ·
// 3 : 1 : 4", "Only Rakib", "By meals". Shares are the units it names, or
// the members' own; equally counts the members it names, or everyone in.
export function splitText(expense: Pick<GroupExpense, "split" | "splits">, members: GroupMember[]): { kind: GroupSplit; detail: string | null; only: string | null } {
  const named = expense.splits.map((split) => ({ split, member: members.find((m) => m.id === split.groupMemberId) })).filter((row) => row.member);
  const active = members.filter((member) => member.status === "ACTIVE");
  const number = (value: number) => String(Math.round(value * 100) / 100);
  if (expense.split === "SHARES") {
    const units = named.length > 0 ? named.map((row) => Number(row.split.units ?? row.member?.shareUnits ?? 1)) : active.map((member) => Number(member.shareUnits));
    return { kind: "SHARES", detail: units.map(number).join(" : "), only: null };
  }
  if (expense.split === "EQUAL") {
    if (named.length === 1) return { kind: "EQUAL", detail: null, only: named[0].member?.name ?? null };
    return { kind: "EQUAL", detail: `÷ ${named.length > 0 ? named.length : active.length}`, only: null };
  }
  return { kind: expense.split, detail: null, only: null };
}

// A category's "Only selected" members who are still in the group, in
// the group's order; null when it is shared by everyone (or none is left).
export function categoryMembers(category: Pick<GroupExpenseCategoryOption, "defaultMemberIds"> | undefined, active: GroupMember[]): GroupMember[] | null {
  const ids = category?.defaultMemberIds ?? [];
  if (ids.length === 0) return null;
  const chosen = active.filter((member) => ids.includes(member.id));
  return chosen.length > 0 ? chosen : null;
}

// The old ?tab=category (the sidebar's) is the Categories page again.
export function groupTabFrom(value: unknown): GroupTab {
  if (value === "category") return "categories";
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

// The group month a day falls in: a month starting on the 10th runs from
// 10 Sep to 9 Oct, keyed "2026-09".
export function groupMonthOf(day: string, startDay = 1): string {
  return Number(day.slice(8, 10)) >= startDay ? day.slice(0, 7) : shiftMonth(day.slice(0, 7), -1);
}

// A "YYYY-MM" key, or today's group month when the value is not one.
export function monthKeyFrom(value: unknown, today: string, startDay = 1): string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : groupMonthOf(today, startDay);
}

// The days a group month covers: from its start day to the day before the
// next month's.
export function monthRangeOf(key: string, startDay = 1): MonthRange {
  const [year, month] = key.split("-").map(Number);
  if (startDay <= 1) return { key, year, month, from: `${key}-01`, to: `${key}-${pad(lastDayOf(year, month))}` };
  const next = shiftMonth(key, 1);
  return { key, year, month, from: `${key}-${pad(startDay)}`, to: `${next}-${pad(startDay - 1)}` };
}

// The day a range's months start on: the 10th for 10 Sep – 9 Oct.
export const startDayOf = (range: Pick<MonthRange, "from">): number => Number(range.from.slice(8, 10));

// The month `offset` months from `key` (negative for earlier).
export function shiftMonth(key: string, offset: number): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

// The months a picker offers: from the earliest entry (or a year back) to
// this month, newest first.
export function monthChoices(today: string, earliest?: string | null, startDay = 1): string[] {
  const current = groupMonthOf(today, startDay);
  const floor = earliest ? earliest.slice(0, 7) : shiftMonth(current, -11);
  const keys: string[] = [];
  for (let key = current; key >= floor && keys.length < 36; key = shiftMonth(key, -1)) keys.push(key);
  return keys;
}

// The months a group's picker offers, newest first: a year back at least,
// further to the earliest closed month or the month on show, and always
// that month (one typed in from the future too). A group that never closed
// a month can still open the ones before this.
export function groupPickerMonths(today: string, history: Pick<GroupSettlementRecord, "periodStart">[], range: Pick<MonthRange, "key" | "from">, startDay = 1): string[] {
  const yearBack = monthRangeOf(shiftMonth(groupMonthOf(today, startDay), -11), startDay).from;
  const earliest = [...history.map((record) => record.periodStart.slice(0, 10)), range.from, yearBack].sort()[0];
  const months = monthChoices(today, earliest, startDay);
  if (!months.includes(range.key)) months.push(range.key);
  return months.sort().reverse();
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

// Whether anything was recorded in a month: a cost, money in or out, a meal.
export function hasActivity(settlement: GroupSettlementResult): boolean {
  return Number(settlement.totalExpense) > 0 || settlement.members.some((row) => Number(row.grossDeposited) > 0 || Number(row.returned) > 0 || Number(row.mealUnits) > 0);
}

// The group month before `range`, when it was never closed though the group
// was already running then (a member was added, or joined, before it ended): the list
// reminds the reader to close it. A record that only overlaps it (the start
// day moved after 1-30 Sep was closed, so last month is now 10 Sep - 9 Oct)
// counts too: the server refuses to close a period that overlaps a record.
// `moneyBefore`: entries dated before `range` sit in no closed month (the
// balances don't add up to the cash), so last month is open even when every
// member was added later.
export function unclosedPreviousMonth(history: GroupSettlementRecord[], members: (Pick<GroupMember, "createdAt"> & { joinedOn?: string | null })[], range: MonthRange, moneyBefore = false): MonthRange | null {
  const previous = monthRangeOf(shiftMonth(range.key, -1), startDayOf(range));
  if (history.some((record) => record.periodStart.slice(0, 10) <= previous.to && record.periodEnd.slice(0, 10) >= previous.from)) return null;
  if (moneyBefore) return previous;
  // A member added late but dated back (joined on the 1st) counts from then.
  return members.some((member) => member.createdAt.slice(0, 10) <= previous.to || (!!member.joinedOn && member.joinedOn.slice(0, 10) <= previous.to)) ? previous : null;
}

// Whether the live figures have moved away from a closed month's record:
// an entry dated inside it changed after closing.
export function recordDiffers(record: GroupSettlementRecord, live: GroupSettlementResult): boolean {
  const apart = (a: string | number, b: string | number) => Math.abs(Number(a) - Number(b)) >= 0.005;
  if (apart(record.totalExpense, live.totalExpense) || apart(record.cashInHand, live.cashInHand)) return true;
  const recorded = new Map(record.members.map((row) => [row.groupMemberId, Number(row.balance)]));
  const current = new Map(live.members.map((row) => [row.groupMemberId, Number(row.balance)]));
  return [...new Set([...recorded.keys(), ...current.keys()])].some((id) => apart(recorded.get(id) ?? 0, current.get(id) ?? 0));
}

// Contributions − returns − expenses paid from the fund: what the fund
// should be holding for the period, which is also every balance added up.
export function cashInHand(settlement: GroupSettlementResult): number {
  return Number(settlement.cashInHand);
}

// What a member put in for the month: their contributions (returns taken
// off) and what they paid for the group from their own pocket. Their
// balance is this less their share of the costs.
export const paidIn = (row: Pick<GroupSettlementMemberRow, "contributed" | "pocketPaid">): number => Number(row.contributed) + Number(row.pocketPaid);

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

// Whether a member is in the group on a day, and at all during a range --
// the server's rule for who shares a cost (an archived member with no
// leaving day is gone for the whole range).
const inGroupOn = (member: GroupMember, day: string) => (member.status === "ACTIVE" || !!member.leftOn) && (!member.joinedOn || member.joinedOn.slice(0, 10) <= day) && (!member.leftOn || member.leftOn.slice(0, 10) >= day);
const inRange = (member: GroupMember, range: Pick<MonthRange, "from" | "to">) => (member.status === "ACTIVE" || !!member.leftOn) && (!member.joinedOn || member.joinedOn.slice(0, 10) <= range.to) && (!member.leftOn || member.leftOn.slice(0, 10) >= range.from);

// Whether by-meals costs go into a meal rate: meal counting is on and some
// meals were marked. Otherwise the server shares them equally, as the day's
// other costs.
export const poolsMeals = (mealsOn: boolean, settlement: Pick<GroupSettlementResult, "mealUnits">): boolean => mealsOn && Number(settlement.mealUnits) > 0;

// One member's part of one expense, as the settlement works it out: the
// members it names (by units or exact amounts), else everyone in the group
// that day. A by-meals expense is pooled into the meal rate instead (0
// here) while meals are pooled, and shared equally otherwise.
export function expenseShare(expense: Pick<GroupExpense, "amount" | "date" | "split" | "splits" | "parts">, memberId: string, members: GroupMember[], range: Pick<MonthRange, "from" | "to">, mealsPooled: boolean): number {
  const amount = Number(expense.amount);
  if (expense.split === "MEALS" && mealsPooled) return 0;
  // The API's own parts when it sent them: they follow the weights of the
  // expense's date and add up to the paisa.
  if (expense.parts && expense.parts.length > 0) return Number(expense.parts.find((part) => part.groupMemberId === memberId)?.amount ?? 0);
  const sharing = members.filter((member) => inRange(member, range));
  const thatDay = sharing.filter((member) => inGroupOn(member, expense.date.slice(0, 10)));
  const everyone = thatDay.length > 0 ? thatDay : sharing;
  const named = expense.splits.filter((split) => members.some((member) => member.id === split.groupMemberId));
  if (expense.split === "EXACT" && named.length > 0) {
    const own = Number(named.find((split) => split.groupMemberId === memberId)?.amount ?? 0);
    const rest = amount - named.reduce((sum, split) => sum + Number(split.amount ?? 0), 0);
    return own + (Math.abs(rest) > 0.004 && everyone.some((member) => member.id === memberId) ? rest / everyone.length : 0);
  }
  const weights: [string, number][] =
    expense.split === "SHARES"
      ? named.length > 0
        ? named.map((split) => [split.groupMemberId, Number(split.units ?? members.find((m) => m.id === split.groupMemberId)?.shareUnits ?? 1)])
        : everyone.map((member) => [member.id, Number(member.shareUnits)])
      : named.length > 0
        ? named.map((split) => [split.groupMemberId, 1])
        : everyone.map((member) => [member.id, 1]);
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  const mine = weights.find(([id]) => id === memberId)?.[1] ?? 0;
  return total > 0 ? (amount * mine) / total : 0;
}

// What each member pays of the month's costs shared one way ("by shares"),
// added up expense by expense, so a cost with its own units counts as it
// was saved.
export function splitTotals(expenses: GroupExpense[], split: GroupSplit, members: GroupMember[], range: Pick<MonthRange, "from" | "to">, mealsPooled: boolean): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const expense of expenses.filter((e) => e.split === split)) {
    for (const member of members) {
      const part = expenseShare(expense, member.id, members, range, mealsPooled);
      if (Math.abs(part) > 0.004) totals[member.id] = (totals[member.id] ?? 0) + part;
    }
  }
  return totals;
}

// Whether "shared cost each" is one figure everybody pays: every cost
// outside the meal pool is split equally among everyone, and nobody joined
// or left during the month.
export function sharedEqually(expenses: Pick<GroupExpense, "split" | "splits">[], mealsPooled: boolean, members: GroupMember[], range: Pick<MonthRange, "from" | "to">): boolean {
  const plain = expenses.every((e) => (e.split === "MEALS" && mealsPooled) || ((e.split === "EQUAL" || e.split === "MEALS") && e.splits.length === 0));
  const wholeMonth = members.filter((member) => inRange(member, range)).every((member) => (!member.joinedOn || member.joinedOn.slice(0, 10) <= range.from) && (!member.leftOn || member.leftOn.slice(0, 10) >= range.to));
  return plain && wholeMonth;
}

// What each member pays of the costs outside the meal pool (all of them when
// no meals are pooled), when sharedEqually says it is one figure for all:
// the Settlement tab and the close dialog show the same one.
export const sharedCostEach = (settlement: Pick<GroupSettlementResult, "totalExpense" | "mealExpense" | "memberCount">): number =>
  settlement.memberCount > 0 ? (Number(settlement.totalExpense) - Number(settlement.mealExpense)) / settlement.memberCount : 0;

// How each category's costs this month were shared: the one way they all
// used, or MIXED. A by-meals cost counts as equal while meals aren't pooled,
// as the server shares it.
export function categorySplits(expenses: Pick<GroupExpense, "category" | "split">[], mealsPooled: boolean): Record<string, GroupSplit | "MIXED"> {
  const used = new Map<string, Set<GroupSplit>>();
  for (const expense of expenses) {
    const split: GroupSplit = expense.split === "MEALS" && !mealsPooled ? "EQUAL" : expense.split;
    used.set(expense.category, (used.get(expense.category) ?? new Set<GroupSplit>()).add(split));
  }
  return Object.fromEntries([...used].map(([name, splits]) => [name, splits.size === 1 ? [...splits][0] : "MIXED"]));
}

// Settling through the manager: whoever owes pays the one holding the
// cash, who returns what the others are owed. The manager's own balance
// stays with them.
export function throughManager(rows: GroupSettlementMemberRow[], managerId: string): (Transfer & { owes: boolean })[] {
  return rows
    .filter((row) => row.groupMemberId !== managerId && Math.abs(Number(row.balance)) >= 0.005)
    .map((row) => {
      const balance = Number(row.balance);
      return balance < 0 ? { fromId: row.groupMemberId, toId: managerId, amount: Math.round(-balance * 100) / 100, owes: true } : { fromId: managerId, toId: row.groupMemberId, amount: Math.round(balance * 100) / 100, owes: false };
    })
    .sort((a, b) => Number(b.owes) - Number(a.owes) || b.amount - a.amount);
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
  // One decimal, as the boards write it (50.8% of Tk 65,000).
  const percent = budget > 0 ? Math.round((spent / budget) * 1000) / 10 : 0;
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

// What was spent in each of the given group months: a month starting on
// the 10th counts 10 Sep – 9 Oct as "2026-09", as its budget does.
export function spendByMonth(expenses: GroupExpense[], months: string[], startDay = 1): { month: string; amount: number }[] {
  const byMonth = new Map(months.map((m) => [m, 0]));
  for (const e of expenses) {
    const key = groupMonthOf(e.date.slice(0, 10), startDay);
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

// A group that has never recorded anything: no closed month, no expense in
// the six months up to the one on show, and no contribution or meal in it.
// Only then does the page show the setup steps; an established group's
// empty month keeps its dashboard (and new members their joining day).
export function isNewGroup(recorded: { history: unknown[]; recentExpenses: unknown[]; contributions: unknown[]; meals: unknown[] }): boolean {
  return recorded.history.length === 0 && recorded.recentExpenses.length === 0 && recorded.contributions.length === 0 && recorded.meals.length === 0;
}

// The month a member joined: their joining day, else when they were added.
export function memberSince(member: GroupMember): string {
  return (member.joinedOn ?? member.createdAt).slice(0, 7);
}

// Titles a Bangladeshi name often starts with: "Md. Arif Hossain" is Arif.
const NAME_PREFIX = /^(?:md|mohd|mohammad|mohammed|mohamed|muhammad|মো|মোহাম্মদ|মুহাম্মদ)[.:ঃ]*$/i;

// A short name for a line that names two people ("Arif pays Khaled"): the
// first word that isn't such a title.
export function shortName(name: string | undefined): string {
  const words = (name ?? "")
    .trim()
    .replace(/^(md|mohd)\.(?=\S)/i, "$1. ")
    .split(/\s+/)
    .filter(Boolean);
  return words.find((word) => !NAME_PREFIX.test(word)) ?? words[0] ?? "?";
}

// A "YYYY-MM-DD" day as the group pages write it: "5 Oct" (or "5 Oct 2026"),
// "৫ অক্টো" in Bangla. Calendar days, so no time zone moves them. With the
// reader's Fmt, their digits, and their date style for a day with its year.
export function dayLabel(day: string, locale: FormatLocale, withYear = false): string {
  return formatDay(day.slice(0, 10), withYear ? "d MMM yyyy" : "d MMM", locale);
}

// A month's days: "1 Oct – 31 Oct 2026", "10 Dec 2026 – 9 Jan 2027" (both
// with their year in a numbered date style).
export function rangeLabel(range: Pick<MonthRange, "from" | "to">, locale: FormatLocale): string {
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4) && !numericDates(locale);
  return `${dayLabel(range.from, locale, !sameYear)} – ${dayLabel(range.to, locale, true)}`;
}

// "1 member" or "3 members", the count in the reader's digits. Bangla words
// both keys alike.
export const countLabel = (t: Translate, locale: FormatLocale, count: number, one: string, many: string, values?: FillValues): string => t(count === 1 ? one : many, { ...values, count: formatCount(count, locale) });

// The budget bar and its figure, by status.
export const BUDGET_TONE_BAR: Record<BudgetTone, string> = { ok: "bg-emerald", warning: "bg-warning-fill", over: "bg-expense-fill" };
export const BUDGET_TONE_TEXT: Record<BudgetTone, string> = { ok: "text-ink", warning: "text-warning", over: "text-expense" };
// The same status on the shared ProgressBar.
export const BUDGET_TONE_PROGRESS = { ok: "money", warning: "warning", over: "expense" } as const satisfies Record<BudgetTone, string>;

// The meal rate as the boards write it, always to the paisa: "৳ 62.00".
export function mealRateText(rate: number | string, currency: string, locale: FormatLocale): string {
  const rounded = Math.round(Number(rate) * 100) / 100;
  const text = formatCurrency(rounded, currency, locale);
  return Number.isInteger(rounded) ? `${text}${toLocaleDigits(".00", locale)}` : text;
}

// "Arif and Rakib", "Arif, Sumon and Rakib": a list of names in one line.
export function namesList(t: Translate, names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return t("{names} and {last}", { names: names.slice(0, -1).join(", "), last: names[names.length - 1] });
}

// A day with its weekday, as the meal pages head it: "Wed, 30 Sep 2026",
// "বুধ, ৩০ সেপ্টে ২০২৬".
export function weekdayLabel(day: string, locale: FormatLocale): string {
  return formatDay(day.slice(0, 10), "EEE, d MMM yyyy", locale);
}
