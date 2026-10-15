import type { SavingsEntryType, SavingsGoal, SavingsGoalStatus, SavingsGoalTrend } from "./api";
import type { WalletPalette } from "./walletVisuals";

// The ring colours the design gives goals, cycled by position; a paused or
// withdrawn goal goes grey.
const GOAL_COLORS = ["var(--pillar-insights)", "var(--emerald)", "var(--pillar-loans)", "var(--pillar-habits)", "var(--info)"];

export function goalColor(index: number, status: SavingsGoalStatus): string {
  if (status === "PAUSED" || status === "WITHDRAWN") return "var(--ink-muted)";
  return GOAL_COLORS[((index % GOAL_COLORS.length) + GOAL_COLORS.length) % GOAL_COLORS.length];
}

export interface GoalBadge {
  label: string;
  chip: "income" | "warning" | "expense" | "neutral";
}

// The chip on a goal card: its pace while active (on track / behind / at
// risk), else its status.
export function goalBadge(goal: Pick<SavingsGoal, "status" | "paceStatus">): GoalBadge {
  switch (goal.status) {
    case "PAUSED":
      return { label: "Paused", chip: "neutral" };
    case "COMPLETED":
      return { label: "Completed", chip: "income" };
    case "WITHDRAWN":
      return { label: "Withdrawn", chip: "neutral" };
    default:
      if (goal.paceStatus === "BEHIND") return { label: "Behind", chip: "warning" };
      if (goal.paceStatus === "WARNING") return { label: "At risk", chip: "expense" };
      return { label: "On track", chip: "income" };
  }
}

export const TREND_META: Record<NonNullable<SavingsGoalTrend>, { label: string; short: string; text: string }> = {
  INCREASING: { label: "↑ Saving more lately", short: "↑ Saving more", text: "text-income" },
  STABLE: { label: "→ Steady", short: "→ Steady", text: "text-ink-muted" },
  DECREASING: { label: "↓ Saving less lately", short: "↓ Saving less", text: "text-expense" },
};

// Whole months from today until the target date; never negative.
export function monthsLeft(targetDate: string, today: string): number {
  const [ty, tm] = targetDate.slice(0, 10).split("-").map(Number);
  const [y, m, d] = today.split("-").map(Number);
  const targetDay = Number(targetDate.slice(8, 10));
  let months = (ty - y) * 12 + (tm - m);
  if (targetDay < d) months -= 1;
  return Math.max(0, months);
}

// What is left to save; never negative once a goal is over-funded.
export function remainingOf(goal: Pick<SavingsGoal, "targetAmount" | "currentAmount">): number {
  return Math.max(0, Number(goal.targetAmount) - Number(goal.currentAmount));
}

// The quick amounts under the Add money field: the monthly target, two
// round figures, and whatever is left -- each once, zeros dropped.
export function quickAmounts(goal: Pick<SavingsGoal, "targetAmount" | "currentAmount" | "monthlyTarget">): { kind: "monthly" | "round" | "rest"; amount: number }[] {
  const seen = new Set<number>();
  const candidates: { kind: "monthly" | "round" | "rest"; amount: number }[] = [
    { kind: "monthly", amount: Math.round(Number(goal.monthlyTarget)) },
    { kind: "round", amount: 5000 },
    { kind: "round", amount: 10000 },
    { kind: "rest", amount: remainingOf(goal) },
  ];
  return candidates.filter((candidate) => {
    if (candidate.amount <= 0 || seen.has(candidate.amount)) return false;
    seen.add(candidate.amount);
    return true;
  });
}

export const ENTRY_META: Record<SavingsEntryType, { title: string; flow: "in" | "out"; tone: "income" | "info" | "expense" }> = {
  CONTRIBUTION: { title: "Added money", flow: "in", tone: "income" },
  TRANSFER_IN: { title: "Moved in from", flow: "in", tone: "info" },
  TRANSFER_OUT: { title: "Moved out to", flow: "out", tone: "info" },
  WITHDRAWAL: { title: "Withdrawn", flow: "out", tone: "expense" },
};

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
