import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import type { ILoginAttemptsSummary } from "@/types/loginAttempt.types";

// What the page needs to build the identical query string on the server.
export const LOGIN_ATTEMPTS_TABLE_BASE_CONFIG = {
  queryKeys: ["email", "success", "ipAddress", "dateFrom", "dateTo"],
  defaultLimit: 20,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;

// The IP filter offers the worst offenders from the summary -- the usual
// starting point for an investigation. Memoize the result.
export const buildLoginAttemptsTableConfig = (topIps: ILoginAttemptsSummary["topIps"]): ServerDataTableConfig => ({
  ...LOGIN_ATTEMPTS_TABLE_BASE_CONFIG,
  search: { placeholder: "Search by email...", queryKey: "email" },
  filters: [
    {
      id: "success",
      type: "single-select",
      label: "Result",
      options: [
        { value: "false", label: "Failed" },
        { value: "true", label: "Succeeded" },
      ],
    },
    { id: "ipAddress", type: "single-select", label: "IP", options: topIps.map((entry) => ({ value: entry.ipAddress, label: entry.ipAddress })) },
    { id: "createdAt", type: "date-range", label: "Date" },
  ],
});
