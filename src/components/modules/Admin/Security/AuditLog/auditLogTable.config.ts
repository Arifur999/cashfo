import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { WHEN_OPTIONS } from "@/lib/timeWindows";
import { AUDIT_ACTION_OPTIONS } from "@/lib/auditActionLabels";
import { AUDIT_RECORD_TYPE_LABEL } from "@/lib/auditRecords";
import type { IAdminAccount } from "@/types/adminAccount.types";

// The kinds of record an entry can be on, alphabetical.
const RECORD_TYPE_OPTIONS = Object.entries(AUDIT_RECORD_TYPE_LABEL)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label));

// What the page needs to build the identical query string on the server.
// The log opens on today.
export const AUDIT_LOG_TABLE_BASE_CONFIG = {
  queryKeys: ["adminUserId", "action", "entityType", "within", "sensitiveOnly"],
  defaultLimit: 20,
  defaults: { within: "today" },
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit" | "defaults">;

// The design's toolbar: who, what, on what and when on the left, "Sensitive
// only" on the right. The admin filter lists every admin account (suspended
// ones too -- their past actions still matter), so the config is built once
// they load.
export const buildAuditLogTableConfig = (admins: IAdminAccount[]): ServerDataTableConfig => ({
  ...AUDIT_LOG_TABLE_BASE_CONFIG,
  filters: [
    { id: "adminUserId", type: "single-select", label: "Admin", allLabel: "Anyone", options: admins.map((admin) => ({ value: admin.id, label: admin.name })) },
    { id: "action", type: "single-select", label: "Action", allLabel: "Everything", options: AUDIT_ACTION_OPTIONS },
    { id: "entityType", type: "single-select", label: "Area", allLabel: "Everything", options: RECORD_TYPE_OPTIONS },
    { id: "within", type: "single-select", label: "When", options: WHEN_OPTIONS },
    { id: "sensitiveOnly", type: "toggle", label: "Sensitive only", align: "end" },
  ],
});
