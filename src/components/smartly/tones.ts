// The colour pairings the design uses for soft tiles, chips and labels: a
// pale fill with its matching ink. One table, so a "loans" tile and a
// "loans" chip can never drift apart.
export type Tone = "money" | "income" | "expense" | "loans" | "habits" | "vault" | "insights" | "warning" | "info" | "neutral";

export const SOFT_TONE: Record<Tone, string> = {
  money: "bg-mint-50 text-emerald",
  income: "bg-mint-50 text-emerald",
  expense: "bg-expense-soft text-expense",
  loans: "bg-pillar-loans-soft text-pillar-loans",
  habits: "bg-pillar-habits-soft text-pillar-habits",
  vault: "bg-info-soft text-info",
  insights: "bg-pillar-insights-soft text-pillar-insights",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  neutral: "bg-surface-sunken text-ink-2",
};

// The text colour alone (eyebrows, pillar dots, links in a section).
export const TONE_TEXT: Record<Tone, string> = {
  money: "text-emerald",
  income: "text-income",
  expense: "text-expense",
  loans: "text-pillar-loans",
  habits: "text-pillar-habits",
  vault: "text-pillar-vault",
  insights: "text-pillar-insights",
  warning: "text-warning",
  info: "text-info",
  neutral: "text-ink-muted",
};

export const TONE_BG: Record<Tone, string> = {
  money: "bg-emerald",
  income: "bg-income",
  expense: "bg-expense-fill",
  loans: "bg-pillar-loans",
  habits: "bg-pillar-habits",
  vault: "bg-pillar-vault",
  insights: "bg-pillar-insights",
  warning: "bg-warning-fill",
  info: "bg-info",
  neutral: "bg-ink-muted",
};
