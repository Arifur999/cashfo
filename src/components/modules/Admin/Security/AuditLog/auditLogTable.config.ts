import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { AUDIT_ACTION_OPTIONS } from "@/lib/auditActionLabels";
import type { IAdminAccount } from "@/types/adminAccount.types";

// The record types the API writes audit entries for.
const ENTITY_TYPES = [
  "AdminUser",
  "Business",
  "BulkNotificationCampaign",
  "Coupon",
  "DefaultAccountTemplate",
  "FeatureFlag",
  "LegalDocument",
  "NotificationTemplate",
  "Payment",
  "PlatformSetting",
  "PlatformUser",
  "SubscriptionPlan",
  "SupportTicket",
  "TranslationString",
  "User",
];

// "SubscriptionPlan" -> "Subscription plan"
const entityLabel = (entityType: string) => {
  const words = entityType.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// What the page needs to build the identical query string on the server.
export const AUDIT_LOG_TABLE_BASE_CONFIG = {
  queryKeys: ["adminUserId", "action", "entityType", "dateFrom", "dateTo", "sensitiveOnly"],
  defaultLimit: 20,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;

// The admin filter lists every admin account (suspended ones too -- their
// past actions still matter), so the config is built once they load.
export const buildAuditLogTableConfig = (admins: IAdminAccount[]): ServerDataTableConfig => ({
  ...AUDIT_LOG_TABLE_BASE_CONFIG,
  filters: [
    { id: "adminUserId", type: "single-select", label: "Admin", options: admins.map((admin) => ({ value: admin.id, label: admin.name })) },
    { id: "action", type: "single-select", label: "Action", options: AUDIT_ACTION_OPTIONS },
    { id: "entityType", type: "single-select", label: "Record", options: ENTITY_TYPES.map((type) => ({ value: type, label: entityLabel(type) })) },
    { id: "createdAt", type: "date-range", label: "Date" },
    { id: "sensitiveOnly", type: "single-select", label: "Sensitivity", options: [{ value: "true", label: "Sensitive only" }] },
  ],
});
