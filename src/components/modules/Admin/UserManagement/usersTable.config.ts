import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { enumTabs } from "@/lib/statusBadge";
import { OWNER_STATUSES, type OwnerStatus } from "@/types/owner.types";
import type { IPlanOption } from "@/types/plan.types";

// What the page needs to build the identical query string on the server.
export const USERS_TABLE_BASE_CONFIG = {
  queryKeys: ["search", "status", "planId"],
} as const satisfies Pick<ServerDataTableConfig, "queryKeys">;

// The plan filter's options come from the API and the status tabs' counts
// from the list response, so the full config is built once those are
// loaded (memoize the result -- it must stay stable).
export const buildUsersTableConfig = (plans: IPlanOption[], statusCounts?: Record<OwnerStatus, number>): ServerDataTableConfig => ({
  ...USERS_TABLE_BASE_CONFIG,
  search: { placeholder: "Search name, email, phone or workspace" },
  filters: [
    { id: "status", type: "tabs", label: "Status", options: enumTabs(OWNER_STATUSES, statusCounts) },
    { id: "planId", type: "single-select", label: "Plan", allLabel: "All plans", options: plans.map((plan) => ({ value: plan.id, label: plan.name })) },
  ],
});
