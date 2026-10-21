import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";

// The list pages through the API like Users does: page 1 is still the
// board's top ten (biggest add-on first), and the shared pager reaches the
// rest and counts them all ("Showing 1–10 of 38"). Nothing to filter, so
// the URL holds only the page and rows per page. Shared by the page's
// fetch and the client table, so both build the identical query string.
export const WORKSPACES_TABLE_BASE_CONFIG = {
  queryKeys: [],
  defaultLimit: 10,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;
