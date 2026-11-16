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
  USER_IMPERSONATION_STARTED: "Started viewing as a customer",
  USER_IMPERSONATION_ENDED: "Stopped viewing as a customer",
  // A wrong or missing support code: logged so a run of guesses shows.
  USER_IMPERSONATION_REFUSED: "Refused to view as a customer",
  USER_PLAN_CHANGED: "Changed a user's plan",
  BUSINESS_PLAN_CHANGED: "Changed a workspace's plan",
  OWNER_DATA_RESET: "Reset an owner's workspace data",
  PASSWORD_RESET_BY_ADMIN: "Reset a password",
  OWNER_PASSWORD_RESET: "Reset a user's password",
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
  FEATURE_FLAG_UPDATED: "Changed a feature flag",
  FEATURE_FLAG_CREATED: "Added a feature flag",
  NOTIFICATION_TEMPLATE_UPDATED: "Updated a notification template",
  CAMPAIGN_CANCELLED: "Cancelled a notification campaign",
  CAMPAIGN_DELETED: "Deleted a notification campaign",
  ANNOUNCEMENT_CREATED: "Made an announcement",
  ANNOUNCEMENT_UPDATED: "Changed an announcement",
  ANNOUNCEMENT_DELETED: "Deleted an announcement",
  PLATFORM_SETTINGS_UPDATED: "Updated platform settings",
  SECURITY_CHECK_RUN: "Ran a security check",
  SECURITY_FLAG_UPDATED: "Reviewed suspicious activity",
  ADMIN_SIGNED_OUT_OTHER_DEVICES: "Signed out their other devices",
  // Admin invites, passwords and two-step sign-in.
  ADMIN_INVITED: "Invited an admin",
  ADMIN_INVITE_RESENT: "Sent an admin invite again",
  ADMIN_INVITE_REVOKED: "Cancelled an admin invite",
  ADMIN_INVITE_ACCEPTED: "Joined the admin team",
  ADMIN_PASSWORD_SET_BY_ADMIN: "Set an admin's password",
  ADMIN_PASSWORD_RESET_BY_EMAIL: "Reset their password by email",
  ADMIN_TWO_STEP_ENABLED: "Turned on two-step sign-in",
  ADMIN_TWO_STEP_DISABLED: "Turned off two-step sign-in",
  ADMIN_BACKUP_CODES_REGENERATED: "Made new backup codes",
  ADMIN_TRUSTED_DEVICE_REMOVED: "Removed a trusted computer",
  // A person's page (Users > a user).
  OWNER_NOTE_ADDED: "Added a note for admins",
  OWNER_NOTE_DELETED: "Deleted a note for admins",
  OWNER_SIGNED_OUT_EVERYWHERE: "Signed a user out everywhere",
  OWNER_DATA_EXPORTED: "Downloaded a copy of a user's data",
  OWNER_DELETION_CANCELLED: "Cancelled an account deletion",
  OWNER_TWO_STEP_DISABLED: "Turned off a user's two-step sign-in",
  OWNERS_EXPORTED: "Exported the user list",
  // Money: plans, payments, invoices and referral payouts.
  PLAN_CREATED: "Created a subscription plan",
  PAYMENT_MARKED_PAID: "Marked a payment paid",
  PAYMENT_MARKED_FAILED: "Marked a payment failed",
  PAYMENTS_EXPORTED: "Exported payments",
  INVOICE_EMAILED: "Emailed an invoice",
  REFERRAL_PAYOUT_APPROVED: "Approved a payout",
  REFERRAL_PAYOUT_REJECTED: "Rejected a payout",
  REFERRAL_PAYOUT_PAID: "Marked a payout paid",
  REFERRAL_COMMISSION_CANCELLED: "Cancelled a referral commission",
  REFERRAL_SETTINGS_UPDATED: "Changed the referral rules",
  // Support, content and notifications.
  SAVED_REPLY_CREATED: "Added a saved reply",
  SAVED_REPLY_UPDATED: "Updated a saved reply",
  SAVED_REPLY_DELETED: "Deleted a saved reply",
  LEGAL_DOCUMENT_PUBLISHED: "Published a legal page",
  NOTIFICATION_TEMPLATE_CREATED: "Created a notification template",
  NOTIFICATION_TEMPLATE_DELETED: "Deleted a notification template",
  CAMPAIGN_SENT: "Sent a notification campaign",
  // System.
  ERROR_LOGS_RESOLVED: "Marked errors fixed",
};

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? humanizeEnum(action);
}

// The audit log's action filter, alphabetical by wording. Only actions the
// API actually records are listed above, so every option can match.
export const AUDIT_ACTION_OPTIONS = Object.entries(ACTION_LABELS)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label));
