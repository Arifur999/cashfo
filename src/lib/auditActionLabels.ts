const ACTION_LABELS: Record<string, string> = {
  ADMIN_LOGIN: "Logged in",
  ADMIN_ACCOUNT_CREATED: "Created a sub-admin account",
  ADMIN_ACCOUNT_UPDATED: "Updated a sub-admin account",
  ADMIN_ACCOUNT_SUSPENDED: "Suspended a sub-admin account",
  USER_SUSPENDED: "Suspended a user",
  USER_ACTIVATED: "Activated a user",
  USER_BANNED: "Banned a user",
  USER_IMPERSONATION_STARTED: "Started impersonating a user",
  USER_PLAN_CHANGED: "Changed a user's plan",
  PASSWORD_RESET_BY_ADMIN: "Reset a password",
  PLAN_UPDATED: "Updated a subscription plan",
  PLAN_ARCHIVED: "Archived a subscription plan",
  PLAN_DELETED: "Deleted a subscription plan",
  PAYMENT_RETRY_TRIGGERED: "Retried a payment",
  PAYMENT_REFUNDED: "Refunded a payment",
  ACCOUNT_TEMPLATE_UPDATED: "Updated an account template",
  TRANSLATION_UPDATED: "Updated a translation string",
  LEGAL_DOC_UPDATED: "Updated a legal document",
  TICKET_UPDATED: "Updated a support ticket",
};

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replaceAll("_", " ").toLowerCase();
}
