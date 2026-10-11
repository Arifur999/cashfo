import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import type { IRateLimitSummary } from "@/types/system.types";

// What the page needs to build the identical query string on the server.
export const RATE_LIMITS_TABLE_BASE_CONFIG = {
  queryKeys: ["limitExceeded", "endpoint"],
  defaultLimit: 20,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;

// The endpoint filter offers the busiest endpoints from the summary.
// Memoize the result.
export const buildRateLimitsTableConfig = (topEndpoints: IRateLimitSummary["topEndpoints"]): ServerDataTableConfig => ({
  ...RATE_LIMITS_TABLE_BASE_CONFIG,
  filters: [
    {
      id: "limitExceeded",
      type: "single-select",
      label: "Result",
      options: [
        { value: "true", label: "Limit exceeded" },
        { value: "false", label: "Within limit" },
      ],
    },
    { id: "endpoint", type: "single-select", label: "Endpoint", options: topEndpoints.map((entry) => ({ value: entry.endpoint, label: entry.endpoint })) },
  ],
});
