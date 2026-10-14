import { humanizeEnum } from "./statusBadge";

// Human phrasing for the audit actions the backend records. Anything not
// listed still reads as a sentence ("FOO_BAR_UPDATED" -> "Foo bar updated")
// instead of a raw constant.
const ACTION_LABELS: Record<string, string> = {
  ADMIN_LOGIN: "Logged in",
  ADMIN_ACCOUNT_CREATED: "Created a sub-admin account",
  ADMIN_ACCOUNT_UPDATED: "Updated a sub-admin account",
  ADMIN_ACCOUNT_SUSPENDED: "Suspended a sub-admin account",
  ADMIN_ACCOUNT_ACTIVATED: "Reactivated an admin account",
  ADMIN_PASSWORD_CHANGED: "Changed their own password",
  USER_SUSPENDED: "Suspended a user",
  USER_ACTIVATED: "Activated a user",
  USER_BANNED: "Banned a user",
  USER_IMPERSONATION_STARTED: "Started impersonating a user",
  USER_PLAN_CHANGED: "Changed a user's plan",
  BUSINESS_PLAN_CHANGED: "Changed a workspace's plan",
  OWNER_DATA_RESET: "Reset an owner's workspace data",
  PASSWORD_RESET_BY_ADMIN: "Reset a password",
  PLAN_UPDATED: "Updated a subscription plan",
  PLAN_ARCHIVED: "Archived a subscription plan",
  PLAN_DELETED: "Deleted a subscription plan",
  COUPON_CREATED: "Created a coupon",
  COUPON_UPDATED: "Updated a coupon",
  COUPON_DELETED: "Deleted a coupon",
  PAYMENT_RETRY_TRIGGERED: "Retried a payment",
  PAYMENT_REFUNDED: "Refunded a payment",
  ACCOUNT_TEMPLATE_UPDATED: "Updated an account template",
  TRANSLATION_CREATED: "Added a translation string",
  TRANSLATION_UPDATED: "Updated a translation string",
  LEGAL_DOC_UPDATED: "Updated a legal document",
  TICKET_UPDATED: "Updated a support ticket",
  FEATURE_FLAG_UPDATED: "Updated a feature flag",
  NOTIFICATION_TEMPLATE_UPDATED: "Updated a notification template",
  CAMPAIGN_CANCELLED: "Cancelled a notification campaign",
  PLATFORM_SETTINGS_UPDATED: "Updated platform settings",
};

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? humanizeEnum(action);
}

// The audit log's action filter, alphabetical by wording. Only actions the
// API actually records are listed above, so every option can match.
export const AUDIT_ACTION_OPTIONS = Object.entries(ACTION_LABELS)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label));
