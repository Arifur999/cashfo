// One status -> colour map for every enum badge in the panel (owner, payment,
// coupon, ticket, flag, campaign, ...), replacing a badge component per enum.
// Adding a status is a one-line change here.
export type BadgeTone = "success" | "info" | "warning" | "danger" | "neutral" | "accent" | "teal" | "orange";

export const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  neutral: "bg-neutral-200 text-neutral-600 dark:bg-neutral-500/20 dark:text-neutral-300",
  accent: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
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
