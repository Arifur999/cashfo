import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { AUDIT_ACTION_OPTIONS } from "@/lib/auditActionLabels";
import { AUDIT_RECORD_TYPE_LABEL } from "@/lib/auditRecords";
import { asStatus, type Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import { WHEN_OPTIONS } from "@/lib/timeWindows";
import type { IAdminAccount } from "@/types/adminAccount.types";

// The kinds of record an entry can be on.
const RECORD_TYPE_OPTIONS = Object.entries(AUDIT_RECORD_TYPE_LABEL).map(([value, label]) => ({ value, label }));

// A filter's choices in the reader's alphabet: the chips show them
// translated (DataTableFacetedFilter), so they sort by those words too.
const inReadingOrder = <T extends { label: string }>(options: readonly T[], translate: Translate, locale: Locale) =>
  [...options].sort((a, b) => translate(asStatus(a.label)).localeCompare(translate(asStatus(b.label)), locale));

// What the page needs to build the identical query string on the server.
// The log opens on today.
export const AUDIT_LOG_TABLE_BASE_CONFIG = {
  queryKeys: ["adminUserId", "action", "entityType", "within", "sensitiveOnly"],
  defaultLimit: 20,
  defaults: { within: "today" },
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit" | "defaults">;

// The design's toolbar: Admin, Action, Area and When on the left, "Sensitive
// only" on the right, as the board names them. The admin filter lists
// every admin account (suspended ones too -- their past actions still
// matter), so the config is built once they load.
export const buildAuditLogTableConfig = (admins: IAdminAccount[], translate: Translate, locale: Locale): ServerDataTableConfig => ({
  ...AUDIT_LOG_TABLE_BASE_CONFIG,
  filters: [
    { id: "adminUserId", type: "single-select", label: "Admin", allLabel: "Anyone", options: admins.map((admin) => ({ value: admin.id, label: admin.name })) },
    { id: "action", type: "single-select", label: "Action", allLabel: "Everything", options: inReadingOrder(AUDIT_ACTION_OPTIONS, translate, locale) },
    { id: "entityType", type: "single-select", label: "Area", allLabel: "Everything", options: inReadingOrder(RECORD_TYPE_OPTIONS, translate, locale) },
    { id: "within", type: "single-select", label: "When", options: WHEN_OPTIONS },
    { id: "sensitiveOnly", type: "toggle", label: "Sensitive only", align: "end" },
  ],
});
