import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { enumTabs } from "@/lib/statusBadge";
import { OWNER_STATUSES, type OwnerStatus } from "@/types/owner.types";

// What the page needs to build the identical query string on the server.
export const MANAGE_OWNERS_TABLE_BASE_CONFIG = {
  queryKeys: ["search", "status"],
  defaultLimit: 20,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;

// The status tabs carry the counts the list response brings back, so the
// full config is built once a page has loaded (memoize the result).
export const buildManageOwnersTableConfig = (statusCounts?: Record<OwnerStatus, number>): ServerDataTableConfig => ({
  ...MANAGE_OWNERS_TABLE_BASE_CONFIG,
  search: { placeholder: "Search by name, business, email, phone" },
  filters: [{ id: "status", type: "tabs", label: "Status", options: enumTabs(OWNER_STATUSES, statusCounts) }],
});
