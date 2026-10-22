import type { DataTableFilterOption } from "@/components/shared/table/dataTable.types";
import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";

// The list pages through the API like Users does: page 1 is still the
// board's top ten (biggest add-on first), and the shared pager reaches the
// rest and counts them all ("Showing 1–10 of 38"). Nothing to filter; the
// URL holds the order besides the page and rows per page. Shared by the
// page's fetch and the client table, so both build the identical query
// string.
export const WORKSPACES_TABLE_BASE_CONFIG = {
  queryKeys: ["sort"],
  defaults: { sort: "addOn" },
  defaultLimit: 10,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaults" | "defaultLimit">;

// The orders the API sorts every owner by before it pages (the columns'
// heads can't, as they would only reorder the rows on screen). Each one
// also names the list above it.
export const WORKSPACES_SORT_OPTIONS: DataTableFilterOption[] = [
  { value: "addOn", label: "Biggest add-on first" },
  { value: "workspaces", label: "Most workspaces first" },
  { value: "extra", label: "Most extra workspaces first" },
  { value: "name", label: "Name, A to Z" },
  { value: "plan", label: "Plan, A to Z" },
];

export const WORKSPACES_TABLE_CONFIG: ServerDataTableConfig = {
  ...WORKSPACES_TABLE_BASE_CONFIG,
  filters: [{ id: "sort", type: "sort", label: "Sort", options: WORKSPACES_SORT_OPTIONS }],
};
