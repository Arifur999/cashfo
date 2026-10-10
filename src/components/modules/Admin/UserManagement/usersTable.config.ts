import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { enumOptions } from "@/lib/statusBadge";
import { OWNER_STATUSES } from "@/types/owner.types";
import type { IPlanOption } from "@/types/plan.types";

// What the page needs to build the identical query string on the server.
export const USERS_TABLE_BASE_CONFIG = {
  queryKeys: ["search", "status", "planId"],
  defaultLimit: 20,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;

// The plan filter's options come from the API, so the full config is built
// once the plans are loaded (memoize the result -- it must stay stable).
export const buildUsersTableConfig = (plans: IPlanOption[]): ServerDataTableConfig => ({
  ...USERS_TABLE_BASE_CONFIG,
  search: { placeholder: "Search by name, business, email or phone..." },
  filters: [
    { id: "status", type: "single-select", label: "Status", options: enumOptions(OWNER_STATUSES) },
    { id: "planId", type: "single-select", label: "Plan", options: plans.map((plan) => ({ value: plan.id, label: plan.name })) },
  ],
});
