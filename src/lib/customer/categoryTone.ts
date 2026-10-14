// Budget categories carry one of twelve colour names (see
// budgetCategoryVisuals). The design draws categories in six colours
// (cat-1 … cat-6), so each name maps onto one of them, as a soft tile fill
// with its ink.
export interface CategoryTone {
  bg: string;
  fg: string;
}

const TONES: Record<string, CategoryTone> = {
  green: { bg: "bg-mint-50", fg: "text-cat-1" },
  lime: { bg: "bg-mint-50", fg: "text-cat-1" },
  teal: { bg: "bg-pillar-insights-soft", fg: "text-cat-5" },
  cyan: { bg: "bg-pillar-insights-soft", fg: "text-cat-5" },
  blue: { bg: "bg-info-soft", fg: "text-cat-4" },
  indigo: { bg: "bg-info-soft", fg: "text-cat-4" },
  purple: { bg: "bg-pillar-habits-soft", fg: "text-cat-3" },
  violet: { bg: "bg-pillar-habits-soft", fg: "text-cat-3" },
  orange: { bg: "bg-pillar-loans-soft", fg: "text-cat-2" },
  yellow: { bg: "bg-warning-soft", fg: "text-warning" },
  pink: { bg: "bg-expense-soft", fg: "text-cat-6" },
  red: { bg: "bg-expense-soft", fg: "text-expense" },
};

const NEUTRAL: CategoryTone = { bg: "bg-surface-sunken", fg: "text-ink-2" };

export function categoryTone(color: string | null | undefined): CategoryTone {
  return (color && TONES[color]) || NEUTRAL;
}

// Transfers and uncategorised rows: a wallet-grey tile.
export const NEUTRAL_CATEGORY_TONE = NEUTRAL;
