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
  // Income & Expense's Uncategorised: a quiet grey beside the real ones.
  grey: { bg: "bg-surface-sunken", fg: "text-ink-faint" },
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

// Income & Expense's own twelve (the CategorySet board's swatches, in its
// order): each saved colour name has its own ink, a text-ie-* class drawn
// with bg-current for a dot. A name the palette doesn't know, and money with
// no category, take the board's quiet grey.
export const IE_CATEGORY_COLORS = ["green", "cyan", "blue", "indigo", "violet", "purple", "pink", "red", "orange", "yellow", "teal", "lime"] as const;

const IE_INKS: Record<string, string> = {
  green: "text-ie-green",
  cyan: "text-ie-cyan",
  blue: "text-ie-blue",
  indigo: "text-ie-indigo",
  violet: "text-ie-violet",
  purple: "text-ie-purple",
  pink: "text-ie-pink",
  red: "text-ie-red",
  orange: "text-ie-orange",
  yellow: "text-ie-yellow",
  teal: "text-ie-teal",
  lime: "text-ie-lime",
  // The app's own fees row (not offered in the picker).
  slate: "text-ie-slate",
};

export const ieCategoryInk = (color: string | null | undefined): string => (color && IE_INKS[color]) || "text-input";

// The same colour as a CSS value, for a chart's gradient and the letter
// tile's --cat (the cat-tile utility).
export const ieCategoryColor = (color: string | null | undefined): string => (color && IE_INKS[color] ? `var(--ie-${color})` : "var(--input)");
