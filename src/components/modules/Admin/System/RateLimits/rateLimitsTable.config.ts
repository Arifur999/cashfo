import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import type { IRateLimitSummary } from "@/types/system.types";

// What the page needs to build the identical query string on the server.
export const RATE_LIMITS_TABLE_BASE_CONFIG = {
  queryKeys: ["limitExceeded", "endpoint"],
  defaultLimit: 20,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;

const RESULT_FILTER: DataTableFilterConfig = {
  id: "limitExceeded",
  type: "single-select",
  label: "Result",
  options: [
    { value: "true", label: "Limit exceeded" },
    { value: "false", label: "Within limit" },
  ],
};

// The endpoint filter offers the busiest endpoints from the summary, and
// only once it names some: a filter with nothing to pick reads as broken.
// Memoize the result.
export const buildRateLimitsTableConfig = (topEndpoints: IRateLimitSummary["topEndpoints"]): ServerDataTableConfig => {
  const endpointFilter: DataTableFilterConfig = {
    id: "endpoint",
    type: "single-select",
    label: "Endpoint",
    options: topEndpoints.map((entry) => ({ value: entry.endpoint, label: entry.endpoint })),
  };
  return { ...RATE_LIMITS_TABLE_BASE_CONFIG, filters: topEndpoints.length > 0 ? [RESULT_FILTER, endpointFilter] : [RESULT_FILTER] };
};
