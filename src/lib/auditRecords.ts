import type { IAuditLogEntry } from "@/types/auditLog.types";
import { diffAuditValues } from "./auditDiff";
import { inEnglish, type Translate } from "./i18n/message";
import { userRecordHref } from "./navItem";
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
export const auditRecordTypeLabel = (entityType: string, t: Translate = inEnglish) => {
  const known = AUDIT_RECORD_TYPE_LABEL[entityType];
  if (known) return t(known);
  const words = entityType.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return t(words.charAt(0).toUpperCase() + words.slice(1));
};

// Actions about the admin themselves (or a check they ran): there is no
// other record to name or open.
const SELF_ACTIONS = new Set(["ADMIN_LOGIN", "ADMIN_PASSWORD_CHANGED", "SECURITY_CHECK_RUN"]);
export const namesNoRecord = (action: string) => SELF_ACTIONS.has(action);
// Bookkeeping fields that say nothing about what changed: the On column
// leaves them out, and an entry's own page folds them away.
export const QUIET_FIELDS: ReadonlySet<string> = new Set(["sensitive", "updatedAt", "createdAt"]);
const NAME_FIELDS = ["name", "title", "code", "key", "subject", "email"] as const;

// A text field of a saved snapshot, if it holds one.
const snapshotText = (value: unknown, field: string): string | null => {
  if (!value || typeof value !== "object") return null;
  const found = (value as Record<string, unknown>)[field];
  return typeof found === "string" && found.trim() ? found : null;
};

// A deleted record can't be looked up, but its snapshot still has a name.
const snapshotName = (value: unknown): string | null => {
  for (const field of NAME_FIELDS) {
    const found = snapshotText(value, field);
    if (found) return found;
  }
  return null;
};

// What the entry was about: "Yearly Pro", "PAY-1A2B3C4D · Mahbub Alam",
// "#4F2A1 · Can't add bKash", "Privacy policy".
export const auditRecordName = (entry: AuditRecord, t: Translate = inEnglish): string => {
  const label = entry.entityLabel ?? snapshotName(entry.newValue) ?? snapshotName(entry.oldValue);
  if (entry.entityType === "Payment" && entry.entityId) {
    return label ? `${shortPaymentId(entry.entityId)} · ${label}` : shortPaymentId(entry.entityId);
  }
  if (entry.entityType === "SupportTicket" && entry.entityId) {
    return label ? `${shortTicketId(entry.entityId)} · ${label}` : shortTicketId(entry.entityId);
  }
  if (entry.entityType === "LegalDocument" && label) {
    return t(humanizeEnum(label));
  }
  return label ?? auditRecordTypeLabel(entry.entityType, t);
};

// "trialDays" -> "trial days"; a nested path keeps only its last part.
export const auditFieldLabel = (path: string) => (path.split(".").pop() ?? path).replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();

const shortValue = (value: string | undefined, t: Translate) => {
  if (value === undefined || value === "null") return t("none");
  return value.length > 24 ? `${value.slice(0, 23)}…` : value;
};

// The reasons the API writes in code rather than words, by action: a refused
// "View as customer" (cashfo_backend/src/admin-owners/owner-impersonation.service.ts).
const REASON_CODE_LABEL: Record<string, Record<string, string>> = {
  USER_IMPERSONATION_REFUSED: {
    "no-code": "No support code was active",
    "wrong-code": "Wrong support code",
  },
};

// An entry's reason as people say it: a code the API wrote ("no-code") in
// words, in the reader's language; a reason an admin typed stays as typed.
export const auditReasonText = (action: string | undefined, reason: string, t: Translate = inEnglish): string => {
  const label = action ? REASON_CODE_LABEL[action]?.[reason] : undefined;
  return label ? t(label) : reason;
};

// One line on what changed: the reason given ("spam invites"), the one field
// that moved ("trial days 7 → 14"), or how many did.
export const auditChangeSummary = (entry: Pick<IAuditLogEntry, "oldValue" | "newValue"> & Partial<Pick<IAuditLogEntry, "action">>, t: Translate = inEnglish): string | null => {
  const reason = entry.newValue && typeof entry.newValue === "object" ? (entry.newValue as { reason?: unknown }).reason : undefined;
  if (typeof reason === "string" && reason.trim()) return auditReasonText(entry.action, reason.trim(), t);
  const changed = diffAuditValues(entry.oldValue, entry.newValue).filter((row) => row.changed && !QUIET_FIELDS.has(row.field.split(".").pop() ?? row.field));
  if (changed.length === 0) return null;
  if (changed.length === 1) {
    const [row] = changed;
    return `${auditFieldLabel(row.field)} ${shortValue(row.before, t)} → ${shortValue(row.after, t)}`;
  }
  if (changed.length === 2) return t("{first} and {second} changed", { first: auditFieldLabel(changed[0].field), second: auditFieldLabel(changed[1].field) });
  return t("{count} fields changed", { count: changed.length });
};

// The audit log's "On" column: the record, then what changed.
export const auditOnText = (entry: AuditRecord, t: Translate = inEnglish): string => {
  if (SELF_ACTIONS.has(entry.action)) return "—";
  const summary = auditChangeSummary(entry, t);
  const name = auditRecordName(entry, t);
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

// The lists that find a record from ?search= (the box on their toolbar):
// where a record with a page of its own goes when the entry has no id.
const SEARCH_LISTS: Record<string, string> = {
  User: "/admin/users",
  Payment: "/admin/payments",
};

const searchHref = (list: string, search: string) => `${list}?${new URLSearchParams({ search: search.trim() }).toString()}`;

// Where "Open" or "Go to" leads from an entry. The record's name and its
// snapshots, when given, point at the record: an owner's reset data opens the
// owner's own page from the id the entry saved, or finds them on Users by the
// saved email (a workspace has no page, and Workspaces lists only the
// biggest), and an entry without an id searches its list for the record's name.
export const auditRecordHref = (
  entry: Pick<IAuditLogEntry, "action" | "entityType" | "entityId"> & Partial<Pick<IAuditLogEntry, "entityLabel" | "oldValue" | "newValue">>,
): string | null => {
  const page = RECORD_PAGES[entry.entityType];
  if (!page || SELF_ACTIONS.has(entry.action)) return null;
  if (entry.entityType === "Business") {
    const owner = (field: string) => snapshotText(entry.oldValue, field) ?? snapshotText(entry.newValue, field);
    const ownerId = owner("ownerId");
    if (ownerId) return userRecordHref(ownerId);
    const ownerEmail = owner("ownerEmail");
    if (ownerEmail) return searchHref(SEARCH_LISTS.User, ownerEmail);
  }
  // A detail page needs the id; a list page ignores it.
  if (entry.entityId) return page(entry.entityId);
  const list = SEARCH_LISTS[entry.entityType];
  if (!list) return page("");
  const name = entry.entityLabel ?? snapshotName(entry.newValue) ?? snapshotName(entry.oldValue);
  return name ? searchHref(list, name) : list;
};
