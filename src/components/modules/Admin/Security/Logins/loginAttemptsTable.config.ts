import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";

// What the page needs to build the identical query string on the server.
export const LOGIN_ATTEMPTS_TABLE_BASE_CONFIG = {
  queryKeys: ["success", "email", "ipAddress", "within"],
  defaultLimit: 20,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;

// The design's toolbar: All / Failed only, an email box and an IP box on
// the left, "When" on the right.
export const LOGIN_ATTEMPTS_TABLE_CONFIG: ServerDataTableConfig = {
  ...LOGIN_ATTEMPTS_TABLE_BASE_CONFIG,
  filters: [
    { id: "success", type: "tabs", label: "Show", allLabel: "All", tone: "sunken", options: [{ value: "false", label: "Failed only" }] },
    { id: "email", type: "text", label: "Email", width: "md" },
    { id: "ipAddress", type: "text", label: "IP address", width: "sm" },
    {
      id: "within",
      type: "single-select",
      label: "When",
      allLabel: "Any time",
      align: "end",
      options: [
        { value: "24h", label: "Last 24 hours" },
        { value: "7d", label: "Last 7 days" },
        { value: "30d", label: "Last 30 days" },
      ],
    },
  ],
};
