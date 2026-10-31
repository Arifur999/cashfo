// Budget categories carry one of twelve colour names (see
// budgetCategoryVisuals), and the design-v4 CategoryDrawer offers all
// twelve as distinct dots: each name maps onto its own ink (cat-1 … cat-11,
// the expense red for red) on a soft tile of its hue family.
export interface CategoryTone {
  bg: string;
  fg: string;
}

const TONES: Record<string, CategoryTone> = {
  blue: { bg: "bg-info-soft", fg: "text-cat-4" },
  green: { bg: "bg-mint-50", fg: "text-cat-1" },
  purple: { bg: "bg-pillar-habits-soft", fg: "text-cat-7" },
  orange: { bg: "bg-pillar-loans-soft", fg: "text-cat-2" },
  pink: { bg: "bg-rose-soft", fg: "text-cat-6" },
  yellow: { bg: "bg-warning-soft", fg: "text-cat-11" },
  red: { bg: "bg-expense-soft", fg: "text-expense" },
  indigo: { bg: "bg-info-soft", fg: "text-cat-8" },
  teal: { bg: "bg-pillar-insights-soft", fg: "text-cat-5" },
  cyan: { bg: "bg-pillar-insights-soft", fg: "text-cat-9" },
  violet: { bg: "bg-pillar-habits-soft", fg: "text-cat-3" },
  lime: { bg: "bg-mint-50", fg: "text-cat-10" },
  // Group Expense's own two (the family boards' Education and Other).
  amber: { bg: "bg-warning-soft", fg: "text-warning" },
  gray: { bg: "bg-surface-sunken", fg: "text-ink-2" },
};

const NEUTRAL: CategoryTone = { bg: "bg-surface-sunken", fg: "text-ink-2" };

export function categoryTone(color: string | null | undefined): CategoryTone {
  return (color && TONES[color]) || NEUTRAL;
}

// The tone's ink as a CSS colour, for what a class can't paint (a chart's
// conic-gradient): text-cat-4 is var(--cat-4), the token itself, as the
// theme's --color-* names live only in the generated classes.
export function categoryColorVar(color: string | null | undefined): string {
  return `var(--${categoryTone(color).fg.replace(/^text-/, "")})`;
}

// The colours a picker offers, in the board's order: every name draws its
// own dot.
export const CATEGORY_TONE_COLORS = ["blue", "green", "purple", "orange", "pink", "yellow", "red", "indigo", "teal", "cyan", "violet", "lime"] as const;

export type CategoryToneColor = (typeof CATEGORY_TONE_COLORS)[number];

// The picker's dot for a saved colour name; null for one it doesn't know.
export function pickerColor(color: string | null | undefined): CategoryToneColor | null {
  if (!color) return null;
  return (CATEGORY_TONE_COLORS as readonly string[]).includes(color) ? (color as CategoryToneColor) : null;
}

// Transfers and uncategorised rows: a wallet-grey tile.
export const NEUTRAL_CATEGORY_TONE = NEUTRAL;
