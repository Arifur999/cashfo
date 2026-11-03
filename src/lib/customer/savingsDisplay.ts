import { formatCount } from "@/lib/i18n/digits";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import type { Translate } from "@/lib/i18n/message";
import type { SavingsEntryType, SavingsGoal, SavingsGoalStatus, SavingsGoalTrend } from "./api";
import type { GoalLook } from "./savingsPlan";
import { formatCurrency } from "./currency";
import type { WalletPalette } from "./walletVisuals";

// The colours the design gives goals, cycled by position (green, blue,
// orange, gold, then the new goals' cyan, violet, pink and teal); a paused
// or withdrawn goal goes grey.
const GOAL_COLORS = ["var(--cat-1)", "var(--cat-4)", "var(--cat-2)", "var(--cat-11)", "var(--cat-9)", "var(--cat-3)", "var(--cat-6)", "var(--cat-5)"];

export function goalColor(index: number, status: SavingsGoalStatus): string {
  if (status === "PAUSED" || status === "WITHDRAWN") return "var(--ink-faint)";
  return GOAL_COLORS[((index % GOAL_COLORS.length) + GOAL_COLORS.length) % GOAL_COLORS.length];
}

// A goal's status chip (design: Ahead, On track, Behind, Paused, Completed,
// Withdrawn, Achieved).
export const LOOK_META: Record<GoalLook, { label: string; chip: "income" | "mint" | "warning" | "neutral" }> = {
  AHEAD: { label: "Ahead", chip: "income" },
  ON_TRACK: { label: "On track", chip: "mint" },
  BEHIND: { label: "Behind", chip: "warning" },
  PAUSED: { label: "Paused", chip: "neutral" },
  COMPLETED: { label: "Completed", chip: "income" },
  WITHDRAWN: { label: "Withdrawn", chip: "neutral" },
  ACHIEVED: { label: "Achieved", chip: "income" },
};

export const TREND_META: Record<NonNullable<SavingsGoalTrend>, { label: string; short: string; text: string }> = {
  INCREASING: { label: "↑ Saving more lately", short: "↑ Saving more", text: "text-income" },
  STABLE: { label: "→ Steady", short: "→ Steady", text: "text-ink-muted" },
  DECREASING: { label: "↓ Saving less lately", short: "↓ Saving less", text: "text-expense" },
};

// Whole calendar months from one day to another ("YYYY-MM-DD", or an ISO time
// whose first ten characters are the day); negative when `to` is earlier.
const wholeMonths = (from: string, to: string): number => {
  const [fy, fm, fd] = from.slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = to.slice(0, 10).split("-").map(Number);
  const months = (ty - fy) * 12 + (tm - fm);
  return td < fd ? months - 1 : months;
};

// Whole months from today until the target date; never negative.
export function monthsLeft(targetDate: string, today: string): number {
  return Math.max(0, wholeMonths(today, targetDate));
}

// A goal's planned length in whole months, from the day it started (or today,
// for a new one) to its target date: what durationMonths stores. The backend
// paces a goal from its createdAt over this many months, so an edit measures
// from there too, never from today. At least one, so it can divide.
export function monthsBetween(from: string, to: string): number {
  return Math.max(1, wholeMonths(from, to));
}

// The same day some months on ("2027-05-03" from "2026-11-03" and 6), or
// that month's last day when it is shorter (31 Aug + 6 = 28 Feb): New goal's
// 6 months / 1 year / 2 years.
export function monthsAhead(day: string, months: number): string {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

// How long an open goal still has: whole months, less than one, or its day
// has gone by ("0 months left" read the same for both).
export type TimeLeft = { kind: "months"; months: number } | { kind: "under-a-month" } | { kind: "past" };

export function timeLeft(targetDate: string, today: string): TimeLeft {
  if (targetDate.slice(0, 10) < today) return { kind: "past" };
  const months = monthsLeft(targetDate, today);
  return months > 0 ? { kind: "months", months } : { kind: "under-a-month" };
}

// The same in words: "8 months left" (in the reader's digits), "Less than a
// month left" or "Past its date".
export function timeLeftText(targetDate: string, today: string, t: Translate, locale: FormatLocale): string {
  const left = timeLeft(targetDate, today);
  if (left.kind === "past") return t("Past its date");
  if (left.kind === "under-a-month") return t("Less than a month left");
  return t(left.months === 1 ? "{count} month left" : "{count} months left", { count: formatCount(left.months, locale) });
}

// What is left to save; never negative once a goal is over-funded.
export function remainingOf(goal: Pick<SavingsGoal, "targetAmount" | "currentAmount">): number {
  return Math.max(0, Number(goal.targetAmount) - Number(goal.currentAmount));
}

// What a goal needs each month from now to finish on time: what is left over
// the whole months to its date. A goal due within a month, or already past
// its date, needs the rest now.
export function neededPerMonth(goal: Pick<SavingsGoal, "targetAmount" | "currentAmount" | "targetDate">, today: string): number {
  return remainingOf(goal) / Math.max(1, monthsLeft(goal.targetDate, today));
}

// How full a goal's ring is: its progress, or for a withdrawn goal what was
// paid out against its target (its saved amount is back to 0 by then).
export function ringPercent(goal: Pick<SavingsGoal, "status" | "progressPercent" | "withdrawnAmount" | "targetAmount">): number {
  if (goal.status !== "WITHDRAWN") return goal.progressPercent;
  const target = Number(goal.targetAmount);
  return target > 0 ? Math.min(100, Math.round((Number(goal.withdrawnAmount) / target) * 100)) : 0;
}

export interface GoalTotals {
  saved: number;
  target: number;
  // Each goal's own gap added up, so one over-funded goal never hides another's.
  toGo: number;
  percent: number;
  // The goals counted.
  count: number;
}

// The Savings goals hero: every goal still open, added up. A withdrawn goal
// was paid out and closed, so its target no longer counts as still to go
// (its saved amount is 0 again). The page has every goal, so this is whole.
export function goalTotals(goals: Pick<SavingsGoal, "status" | "targetAmount" | "currentAmount">[]): GoalTotals {
  const open = goals.filter((goal) => goal.status !== "WITHDRAWN");
  const saved = open.reduce((sum, goal) => sum + Number(goal.currentAmount), 0);
  const target = open.reduce((sum, goal) => sum + Number(goal.targetAmount), 0);
  const toGo = open.reduce((sum, goal) => sum + remainingOf(goal), 0);
  return { saved, target, toGo, percent: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0, count: open.length };
}

// What each history entry is called. A move names the other goal when it
// still exists ("Moved in from Hajj"), else just the direction.
export const ENTRY_META: Record<SavingsEntryType, { title: string; withGoal?: string; flow: "in" | "out"; tone: "income" | "info" | "expense" }> = {
  CONTRIBUTION: { title: "Added money", flow: "in", tone: "income" },
  TRANSFER_IN: { title: "Moved in", withGoal: "Moved in from {goal}", flow: "in", tone: "info" },
  TRANSFER_OUT: { title: "Moved out", withGoal: "Moved out to {goal}", flow: "out", tone: "info" },
  WITHDRAWAL: { title: "Withdrawn", flow: "out", tone: "expense" },
};

// The backend's refusals in this area, in words the dictionary has. A fixed
// message is its own key; one that names a wallet or goal and amounts
// ('"DPS" only has 2000.00 -- cannot withdraw 5000.00 from it. ...') becomes
// a sentence with the name and the amounts in this currency. Anything else,
// or no message at all, gives the caller's fallback key, translated.
const PATTERNS: { pattern: RegExp; key: string }[] = [
  { pattern: /^"(.+)" only has (-?[\d.]+) -- cannot withdraw (-?[\d.]+) from it\./, key: "{name} only has {amount}, not the {needed} this goal holds. Pick another savings wallet." },
  { pattern: /^"(.+)" only has (-?[\d.]+) saved -- cannot transfer (-?[\d.]+)/, key: "{name} only has {amount} saved, so {needed} can't be moved." },
  { pattern: /^"(.+)" has been withdrawn -- pick another goal/, key: "{name} has been withdrawn. Pick another goal to move the money to." },
  { pattern: /^"(.+)" only has (-?[\d.]+) saved -- cannot withdraw (-?[\d.]+)/, key: "{name} only has {amount} saved, so {needed} can't be withdrawn." },
  { pattern: /^"(.+)" no longer has this money, so the move can't be undone\./, key: "{name} no longer has this money, so the move can't be undone." },
  { pattern: /^"(.+)" has been withdrawn, so this move can't be undone\./, key: "{name} has been withdrawn, so this move can't be undone." },
];

export function savingsError(message: string | undefined, fallback: string, t: Translate, currency: string, locale: FormatLocale = "en"): string {
  if (!message) return t(fallback);
  for (const { pattern, key } of PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const [, name, amount, needed] = match;
      return t(key, { name, amount: amount ? formatCurrency(amount, currency, locale) : "", needed: needed ? formatCurrency(needed, currency, locale) : "" });
    }
  }
  return t(message);
}

// The card colours for savings wallets: the design's violet and teal first,
// then the forest and mint of the money wallets.
export const SAVINGS_PALETTES: WalletPalette[] = [
  { gradient: "bg-savings-violet", bar: "bg-pillar-habits", tile: "bg-pillar-habits-soft text-pillar-habits" },
  { gradient: "bg-wallet-teal", bar: "bg-pillar-insights", tile: "bg-pillar-insights-soft text-pillar-insights" },
  { gradient: "bg-wallet-forest", bar: "bg-emerald", tile: "bg-mint-50 text-emerald" },
  { gradient: "bg-wallet-mint", bar: "bg-jade", tile: "bg-mint-50 text-emerald" },
];

export function savingsPalette(index: number): WalletPalette {
  return SAVINGS_PALETTES[((index % SAVINGS_PALETTES.length) + SAVINGS_PALETTES.length) % SAVINGS_PALETTES.length];
}

// A wallet Savings wallets doesn't show (an archived one, the old pooled
// account): grey, so it never borrows another wallet's colour.
export const OTHER_SAVINGS_PALETTE: WalletPalette = { gradient: "bg-wallet-charcoal", bar: "bg-line-strong", tile: "bg-surface-sunken text-ink-muted" };

// A Savings summary row's colour: the one its wallet has on the Savings
// wallets page (its place among the active wallets listed there), so the
// same wallet looks the same on both pages.
export function summaryPalette(id: string, activeIds: readonly string[]): WalletPalette {
  const at = activeIds.indexOf(id);
  return at === -1 ? OTHER_SAVINGS_PALETTE : savingsPalette(at);
}

// The savings account a goal names on its card and in its details: the one
// it keeps its money in, or (an older goal with none) where most of its
// money is; null when it has neither.
export function keptIn(goal: Pick<SavingsGoal, "account" | "holdings">): { name: string; number: string | null } | null {
  if (goal.account?.name) return { name: goal.account.name, number: goal.account.accountNumber };
  const largest = goal.holdings.find((holding) => holding.name);
  return largest?.name ? { name: largest.name, number: null } : null;
}
