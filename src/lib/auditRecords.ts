import type { IAuditLogEntry } from "@/types/auditLog.types";
import { diffAuditValues } from "./auditDiff";
import { shortPaymentId } from "./payments";
import { humanizeEnum } from "./statusBadge";
import { shortTicketId } from "./tickets";

type AuditRecord = Pick<IAuditLogEntry, "action" | "entityType" | "entityId" | "entityLabel" | "oldValue" | "newValue">;

// The kinds of record the API writes audit entries for, as people say them.
export const AUDIT_RECORD_TYPE_LABEL: Record<string, string> = {
  AdminUser: "Admin account",
  Business: "Workspace",
  BulkNotificationCampaign: "Campaign",
  Coupon: "Coupon",
  DefaultAccountTemplate: "Account template",
  FeatureFlag: "Feature flag",
  LegalDocument: "Legal page",
  NotificationTemplate: "Message template",
  Payment: "Payment",
  PlatformSetting: "Platform settings",
  PlatformUser: "User (old record)",
  SubscriptionPlan: "Subscription plan",
  SupportTicket: "Support ticket",
  SuspiciousActivityFlag: "Suspicious activity",
  TranslationString: "Translation",
  User: "User",
};

// "SubscriptionPlan" -> "Subscription plan", for a type nobody listed yet.
export const auditRecordTypeLabel = (entityType: string) => {
  const known = AUDIT_RECORD_TYPE_LABEL[entityType];
  if (known) return known;
  const words = entityType.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// Actions about the admin themselves (or a check they ran): there is no
// other record to name or open.
const SELF_ACTIONS = new Set(["ADMIN_LOGIN", "ADMIN_PASSWORD_CHANGED", "SECURITY_CHECK_RUN"]);
export const namesNoRecord = (action: string) => SELF_ACTIONS.has(action);
// Bookkeeping fields that say nothing about what changed.
const QUIET_FIELDS = new Set(["sensitive", "updatedAt", "createdAt"]);
const NAME_FIELDS = ["name", "title", "code", "key", "subject", "email"] as const;

// A deleted record can't be looked up, but its snapshot still has a name.
const snapshotName = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null;
  for (const field of NAME_FIELDS) {
    const found = (value as Record<string, unknown>)[field];
    if (typeof found === "string" && found.trim()) return found;
  }
  return null;
};

// What the entry was about: "Yearly Pro", "PAY-1A2B3C4D · Mahbub Alam",
// "#4F2A1 · Can't add bKash", "Privacy policy".
export const auditRecordName = (entry: AuditRecord): string => {
  const label = entry.entityLabel ?? snapshotName(entry.newValue) ?? snapshotName(entry.oldValue);
  if (entry.entityType === "Payment" && entry.entityId) {
    return label ? `${shortPaymentId(entry.entityId)} · ${label}` : shortPaymentId(entry.entityId);
  }
  if (entry.entityType === "SupportTicket" && entry.entityId) {
    return label ? `${shortTicketId(entry.entityId)} · ${label}` : shortTicketId(entry.entityId);
  }
  if (entry.entityType === "LegalDocument" && label) {
    return humanizeEnum(label);
  }
  return label ?? auditRecordTypeLabel(entry.entityType);
};

// "trialDays" -> "trial days"; a nested path keeps only its last part.
export const auditFieldLabel = (path: string) => (path.split(".").pop() ?? path).replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();

const shortValue = (value: string | undefined) => {
  if (value === undefined || value === "null") return "none";
  return value.length > 24 ? `${value.slice(0, 23)}…` : value;
};

// One line on what changed: the reason given ("spam invites"), the one field
// that moved ("trial days 7 → 14"), or how many did.
export const auditChangeSummary = (entry: Pick<IAuditLogEntry, "oldValue" | "newValue">): string | null => {
  const reason = entry.newValue && typeof entry.newValue === "object" ? (entry.newValue as { reason?: unknown }).reason : undefined;
  if (typeof reason === "string" && reason.trim()) return reason.trim();
  const changed = diffAuditValues(entry.oldValue, entry.newValue).filter((row) => row.changed && !QUIET_FIELDS.has(row.field.split(".").pop() ?? row.field));
  if (changed.length === 0) return null;
  if (changed.length === 1) {
    const [row] = changed;
    return `${auditFieldLabel(row.field)} ${shortValue(row.before)} → ${shortValue(row.after)}`;
  }
  if (changed.length === 2) return `${auditFieldLabel(changed[0].field)} and ${auditFieldLabel(changed[1].field)} changed`;
  return `${changed.length} fields changed`;
};

// The audit log's "On" column: the record, then what changed.
export const auditOnText = (entry: AuditRecord): string => {
  if (SELF_ACTIONS.has(entry.action)) return "—";
  const summary = auditChangeSummary(entry);
  const name = auditRecordName(entry);
  return summary ? `${name} · ${summary}` : name;
};

// Where the record lives in the panel: its own page when it has one, else
// the list it sits in. Old PlatformUser records have nowhere to go.
const RECORD_PAGES: Record<string, (id: string) => string> = {
  User: (id) => `/admin/users/${id}`,
  Payment: (id) => `/admin/payments/${id}`,
  SupportTicket: (id) => `/admin/support/${id}`,
  AdminUser: () => "/admin/security/admins",
  Business: () => "/admin/workspaces",
  SubscriptionPlan: () => "/admin/plans",
  Coupon: () => "/admin/coupons",
  BulkNotificationCampaign: () => "/admin/notifications/campaigns",
  NotificationTemplate: () => "/admin/notifications",
  LegalDocument: () => "/admin/content/legal",
  TranslationString: () => "/admin/content/translations",
  DefaultAccountTemplate: () => "/admin/content/categories",
  FeatureFlag: () => "/admin/system/feature-flags",
  PlatformSetting: () => "/admin/settings",
  SuspiciousActivityFlag: () => "/admin/security/flags",
};

export const auditRecordHref = (entry: Pick<IAuditLogEntry, "action" | "entityType" | "entityId">): string | null => {
  const page = RECORD_PAGES[entry.entityType];
  if (!page || SELF_ACTIONS.has(entry.action)) return null;
  // A detail page needs the id; a list page ignores it.
  return page(entry.entityId ?? "");
};
