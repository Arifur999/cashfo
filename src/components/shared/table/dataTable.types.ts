import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import type { PaginationMeta } from "@/types/api.types";

export interface DataTableFilterOption {
  label: string;
  value: string;
  icon?: LucideIcon;
}

export interface DataTableTabOption {
  label: string;
  value: string;
  // Shown after the label: "Active 1,251".
  count?: number;
}

export type DataTableFilterConfig = (
  // allLabel is what the chip says while nothing is picked ("Admin: Anyone").
  | { id: string; type: "single-select"; label: string; options: DataTableFilterOption[]; allLabel?: string }
  | { id: string; type: "multi-select"; label: string; options: DataTableFilterOption[]; allLabel?: string }
  // The design's status tabs: one row of exclusive choices, with counts, at
  // the front of the toolbar. The first tab (allLabel) clears the filter.
  // "sunken" drops the cream border for the plainer pill some lists use.
  | { id: string; type: "tabs"; label: string; options: DataTableTabOption[]; allLabel?: string; tone?: "cream" | "sunken" }
  // Server-managed date ranges map onto two URL params, dateFrom/dateTo by
  // default (the convention every list endpoint uses).
  | { id: string; type: "date-range"; label: string; fromKey?: string; toKey?: string }
  // A small text box for one field ("Email", "IP address"); the label is its
  // placeholder. "sm" is 130px wide, "md" 170px.
  | { id: string; type: "text"; label: string; width?: "sm" | "md" }
  // A switch with its label ("Sensitive only"); on sends "true".
  | { id: string; type: "toggle"; label: string }
) & {
  // "end" puts the filter at the far right of the toolbar, beside the table
  // tools ("When: Last 24 hours", "Sensitive only").
  align?: "start" | "end";
};

export interface DateRangeValue {
  from?: string;
  to?: string;
}

export type DataTableFilterValue = string | string[] | DateRangeValue;
export type DataTableFilterValues = Record<string, DataTableFilterValue | undefined>;

export interface DataTableRowAction<TData> {
  label: string;
  icon?: LucideIcon;
  onClick: (row: TData) => void;
  destructive?: boolean;
  hidden?: (row: TData) => boolean;
}

// A handler that's undefined simply doesn't render its menu item.
export interface DataTableActions<TData> {
  // "inline" draws the actions as small buttons in the row (View, Reset
  // data) instead of behind a "..." menu; "split" draws only View as a
  // button and keeps the rest behind the menu.
  display?: "menu" | "inline" | "split";
  // What the View button says when drawn inline ("Who used it").
  viewLabel?: string;
  onView?: (row: TData) => void;
  onEdit?: (row: TData) => void;
  onDelete?: (row: TData) => void;
  extra?: DataTableRowAction<TData>[];
}

export interface DataTableBulkAction<TData> {
  label: string;
  icon?: LucideIcon;
  onClick: (rows: TData[]) => void;
  destructive?: boolean;
}

export interface DataTableSimplePager {
  previous: string;
  next: string;
  // Left of the buttons: "1,284 entries · newest first", or the rows on
  // screen ("Showing 1–10 of 1,912 payments").
  summary: (total: number, range: { first: number; last: number }) => React.ReactNode;
}

export interface DataTableSearchConfig {
  placeholder?: string;
  // "sm" is the 240px box the design draws when tabs share the row.
  width?: "sm" | "md";
  initialValue?: string;
  debounceMs?: number;
  // Present = server-side search (the URL drives the query); absent = the
  // table filters its in-memory rows itself.
  onDebouncedChange?: (value: string) => void;
}

export interface DataTableFiltersConfig {
  configs: DataTableFilterConfig[];
  // Present = server-managed (controlled by the URL); absent = the table
  // filters columns in memory, and `config.id` must be a column id.
  values?: DataTableFilterValues;
  onFilterChange?: (filterId: string, value: DataTableFilterValue | undefined) => void;
  onClearAll?: () => void;
}

export interface DataTableProps<TData> {
  // undefined while loading; the table substitutes a stable empty array.
  data: TData[] | undefined;
  columns: ColumnDef<TData>[];
  getRowId?: (row: TData) => string;
  // Tree data (e.g. a chart of accounts): a row's children. Rows start
  // expanded, search/filters keep a parent whose child matches, and pages
  // count top-level rows only. Render the first column with DataTableTreeCell.
  getSubRows?: (row: TData) => TData[] | undefined;
  // Column ids that stay off screen: there only for the tabs and filters
  // to work on. Keep it module-level.
  defaultHiddenColumns?: readonly string[];
  actions?: DataTableActions<TData>;
  // A heading at the front of the toolbar ("Biggest add-on first").
  title?: string;
  toolbarAction?: React.ReactNode;
  // A note under the rows, after an (i): how a column is worked out, a
  // caveat.
  footer?: React.ReactNode;
  // A list with nothing to search or filter (the admin team) draws no toolbar.
  hideToolbar?: boolean;
  // 2 puts the filter chips on a row of their own under the tabs and the
  // search, as the design's Users list does; 1 (the default) keeps one row.
  toolbarRows?: 1 | 2;
  // Under the rows: numbered pages once there is more than one. A
  // time-ordered log draws "Newer" / "Older" beside a summary instead.
  pager?: DataTableSimplePager;
  emptyMessage?: string;
  // First load (skeleton rows) vs background refetch (progress bar, rows stay).
  isLoading?: boolean;
  isFetching?: boolean;
  onRowClick?: (row: TData) => void;
  // Extra classes for a row that needs singling out (a payment that looks
  // like a double charge gets an amber wash).
  rowClassName?: (row: TData) => string | undefined;
  enableRowSelection?: boolean;
  bulkActions?: DataTableBulkAction<TData>[];
  // What the page header's Export button downloads, as CSV, when the page
  // wraps its header and table in an ExportProvider; the file is named
  // after it.
  exportFileName?: string;
  search?: DataTableSearchConfig;
  filters?: DataTableFiltersConfig;
  // Presence flips the table into server-managed mode for that concern.
  sorting?: { state: SortingState; onSortingChange: (state: SortingState) => void };
  pagination?: { state: PaginationState; onPaginationChange: (state: PaginationState) => void };
  meta?: PaginationMeta;
  initialPageSize?: number;
}
