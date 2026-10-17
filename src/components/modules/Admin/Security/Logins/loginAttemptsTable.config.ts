import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { WHEN_OPTIONS } from "@/lib/timeWindows";

// What the page needs to build the identical query string on the server.
// The list opens on the last 24 hours.
export const LOGIN_ATTEMPTS_TABLE_BASE_CONFIG = {
  queryKeys: ["success", "email", "ipAddress", "within"],
  defaultLimit: 20,
  defaults: { within: "24h" },
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit" | "defaults">;

// The design's toolbar: All / Failed only, an email box and an IP box on
// the left, "When" on the right.
export const LOGIN_ATTEMPTS_TABLE_CONFIG: ServerDataTableConfig = {
  ...LOGIN_ATTEMPTS_TABLE_BASE_CONFIG,
  filters: [
    { id: "success", type: "tabs", label: "Show", allLabel: "All", tone: "sunken", options: [{ value: "false", label: "Failed only" }] },
    { id: "email", type: "text", label: "Email", width: "md" },
    { id: "ipAddress", type: "text", label: "IP address", width: "sm" },
    { id: "within", type: "single-select", label: "When", align: "end", options: WHEN_OPTIONS },
  ],
};
