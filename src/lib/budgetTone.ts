// The design's budget colours (rule F15): under 70% of the limit green,
// 70–90% amber, over 90% red. One place, so a bar, a chip and a sentence
// about the same budget always agree.
export type BudgetTone = "income" | "warning" | "expense";

export function budgetTone(percentUsed: number): BudgetTone {
  if (percentUsed > 90) return "expense";
  if (percentUsed >= 70) return "warning";
  return "income";
}

// The fill colour of a progress bar for each tone.
export const BUDGET_TONE_BAR: Record<BudgetTone, string> = {
  income: "bg-income",
  warning: "bg-warning-fill",
  expense: "bg-expense-fill",
};
