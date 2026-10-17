// One status -> colour map for every enum badge in the panel (owner, payment,
// coupon, ticket, flag, campaign, ...), replacing a badge component per enum.
// Adding a status is a one-line change here.
export type BadgeTone = "success" | "info" | "warning" | "danger" | "neutral" | "accent" | "teal" | "orange";

// The design's soft tiles: a pale fill with its ink (dark mode comes from
// the tokens themselves).
export const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-mint-50 text-emerald",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  danger: "bg-expense-soft text-expense",
  neutral: "bg-surface-sunken text-ink-2",
  accent: "bg-pillar-habits-soft text-pillar-habits",
  teal: "bg-pillar-insights-soft text-pillar-insights",
  orange: "bg-pillar-loans-soft text-pillar-loans",
};

const STATUS_TONES: Record<string, BadgeTone> = {
  // lifecycle
  ACTIVE: "success",
  SUCCESS: "success",
  SENT: "success",
  RESOLVED: "success",
  SHIPPED: "success",
  COMPLETED: "success",
  PENDING: "info",
  OPEN: "info",
  QUEUED: "info",
  SCHEDULED: "info",
  UNDER_REVIEW: "info",
  IN_PROGRESS: "warning",
  REVIEWING: "warning",
  SENDING: "warning",
  PLANNED: "accent",
  WAITING_ON_USER: "accent",
  SUSPENDED: "orange",
  FAILED: "danger",
  DISABLED: "danger",
  DECLINED: "danger",
  CANCELLED: "danger",
  REJECTED: "danger",
  BANNED: "danger",
  EXPIRED: "neutral",
  REFUNDED: "neutral",
  DELETED: "neutral",
  CLOSED: "neutral",
  DRAFT: "neutral",
  SUBMITTED: "neutral",
  FALSE_POSITIVE: "neutral",
  ARCHIVED: "neutral",
  // priority / severity
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "orange",
  URGENT: "danger",
  CRITICAL: "danger",
  // admin roles
  SUPER_ADMIN: "accent",
  SUPPORT_ADMIN: "info",
  FINANCE_ADMIN: "success",
  CONTENT_ADMIN: "warning",
  // ledger: account types and category directions
  ASSET: "info",
  LIABILITY: "orange",
  EQUITY: "accent",
  INCOME: "success",
  EXPENSE: "warning",
  // workspace kinds
  PERSONAL: "info",
  BUSINESS: "accent",
  GROUP: "teal",
  // announcement types
  INFO: "info",
  WARNING: "warning",
  PROMOTION: "success",
  MAINTENANCE: "danger",
  // sources / channels
  BACKEND_API: "info",
  ADMIN_FRONTEND: "accent",
  BACKGROUND_JOB: "teal",
  EMAIL: "info",
  SMS: "accent",
  IN_APP_PUSH: "teal",
};

// Values whose humanized form would read wrong.
const LABEL_OVERRIDES: Record<string, string> = {
  SMS: "SMS",
  IN_APP_PUSH: "In-app push",
  BACKEND_API: "Backend API",
  BKASH: "bKash",
  SSLCOMMERZ: "SSLCommerz",
  FAQ: "FAQ",
};

export const getStatusTone = (status: string): BadgeTone => STATUS_TONES[status] ?? "neutral";

// "WAITING_ON_USER" -> "Waiting on user"
export const humanizeEnum = (value: string): string => {
  const override = LABEL_OVERRIDES[value];
  if (override) {
    return override;
  }
  const words = value.toLowerCase().split("_");
  return [words[0].charAt(0).toUpperCase() + words[0].slice(1), ...words.slice(1)].join(" ");
};

// Builds a <select>/faceted-filter option list from an enum's values.
export const enumOptions = <TValue extends string>(values: readonly TValue[]) =>
  values.map((value) => ({ value, label: humanizeEnum(value) }));

// The status tabs' options, each with its count from the list response
// (undefined until the first page has loaded).
export const enumTabs = <TValue extends string>(values: readonly TValue[], counts?: Partial<Record<TValue, number>>) =>
  values.map((value) => ({ value, label: humanizeEnum(value), count: counts?.[value] }));
