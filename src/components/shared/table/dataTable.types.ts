import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import type { PaginationMeta } from "@/types/api.types";
import type { ExportPage } from "./exportAll";

export interface DataTableFilterOption {
  label: string;
  value: string;
  icon?: LucideIcon;
  // The label is a record's own name (a plan's "Business"), shown as it is
  // instead of being looked up as a word to translate.
  raw?: boolean;
}

export interface DataTableTabOption {
  label: string;
  value: string;
  // Shown after the label: "Active 1,251".
  count?: number;
  // The count's colour when it asks for attention ("Missing Bangla 12" in
  // amber); muted otherwise.
  countClassName?: string;
}

export type DataTableFilterConfig = (
  // allLabel is what the chip says while nothing is picked ("Admin: Anyone");
  // a defaultValue is picked while the URL names nothing ("When: Today").
  | { id: string; type: "single-select"; label: string; options: DataTableFilterOption[]; allLabel?: string; defaultValue?: string }
  | { id: string; type: "multi-select"; label: string; options: DataTableFilterOption[]; allLabel?: string }
  // The design's status tabs: one row of exclusive choices, with counts, at
  // the front of the toolbar. The first tab (allLabel) clears the filter.
  // "sunken" drops the outline for the plainer pill some lists use.
  // defaultValue: the tab an empty URL means, with no All tab (Owners).
  // allCount: the All tab's own count, when the tabs overlap and their sum
  // isn't the whole (Translations' Missing Bangla and Changed this week).
  | { id: string; type: "tabs"; label: string; options: DataTableTabOption[]; allLabel?: string; allCount?: number; tone?: "bordered" | "sunken"; defaultValue?: string }
  // Server-managed date ranges map onto two URL params, dateFrom/dateTo by
  // default (the convention every list endpoint uses).
  | { id: string; type: "date-range"; label: string; fromKey?: string; toKey?: string }
  // A small text box for one field ("Email", "IP address"); the label is its
  // placeholder. "sm" is 130px wide, "md" 170px.
  | { id: string; type: "text"; label: string; width?: "sm" | "md" }
  // A switch with its label ("Sensitive only"); on sends "true".
  | { id: string; type: "toggle"; label: string }
  // The list's order, as plain words at the end of the filter row ("Sort:
  // Last sign-in, newest first").
  | { id: string; type: "sort"; label: string; options: DataTableFilterOption[]; defaultValue?: string }
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
  // false leaves the inline buttons' column without a heading, as the
  // design's Payments list draws its Retry column.
  heading?: boolean;
  // The row's name ("Rahim Uddin"), so the buttons and the "..." menu tell a
  // screen reader whose row they act on: "View for Rahim Uddin", "Open row
  // actions for Rahim Uddin".
  rowLabel?: (row: TData) => string;
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
  // screen ("Showing 1–10 of 1,912 payments"). The range is pageRange's, so
  // a stale ?page=99 still reads 41–50, never 981–50.
  summary: (total: number, range: { first: number; last: number; page: number; pageSize: number }) => React.ReactNode;
}

// How a list sits in its card, from the design's grid for it: the gap
// between columns, the rows' height, the heads' padding and the actions
// column's width. Column widths are each column's meta.width.
export interface DataTableLayout {
  gap?: 12 | 16;
  rowHeight?: number;
  headPadding?: 8 | 12;
  actionsWidth?: number;
  // The card's width on the 1440 board (1136, or less beside a side card):
  // columns keep their share of it at any screen width.
  designWidth?: number;
  // Set: each column keeps its meta.width in px instead of its share of the
  // card, so nothing crushes an id or a badge on a narrower screen. The
  // column without a width gives way instead, down to this many px (gaps not
  // included), and then the table scrolls sideways; on a wider card that
  // column takes the extra room.
  flexMinWidth?: number;
}

// A column the CSV has and the screen doesn't (a gateway's reference, why a
// payment failed): its heading, in English like the table's own, and each
// row's value.
export interface DataTableExportColumn<TData> {
  label: string;
  value: (row: TData) => string | number | boolean | null | undefined;
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
  layout?: DataTableLayout;
  // 2 puts the filter chips on a row of their own under the tabs and the
  // search, as the design's Users list does; 1 (the default) keeps one row.
  toolbarRows?: 1 | 2;
  // Under the rows: "Showing 1–10 of 54", numbered pages once there is more
  // than one, and rows per page. A time-ordered log draws "Newer" / "Older"
  // beside a summary instead. Either way one page shows the summary alone.
  pager?: DataTableSimplePager;
  emptyMessage?: string;
  // Beside "Clear filters" under an empty list: another way out ("Show the
  // last 7 days").
  emptyAction?: React.ReactNode;
  // First load (skeleton rows) vs background refetch (progress bar, rows stay).
  isLoading?: boolean;
  isFetching?: boolean;
  // The read failed (toTableQueryProps passes the list query's, with its
  // refetch as onRetry): with no rows to show, an error and Try again take
  // their place while the toolbar stays, so a filter that broke the read can
  // be changed back. Rows already on screen stay.
  isError?: boolean;
  onRetry?: () => void;
  // What failed, in English ("Couldn't load payments"); "Couldn't load this
  // list" by default. The line under it is ErrorState's own unless given.
  errorTitle?: string;
  errorDescription?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  // The page a row opens. The whole row becomes a real link: Ctrl and the
  // middle button open a new tab, and a screen reader lists it, named by the
  // row's first cell. Buttons, links and boxes in the row keep their own
  // clicks. A row given a page takes no onRowClick.
  rowHref?: (row: TData) => string | undefined;
  // Extra classes for a row that needs singling out (a payment that looks
  // like a double charge gets an amber wash).
  rowClassName?: (row: TData) => string | undefined;
  enableRowSelection?: boolean;
  bulkActions?: DataTableBulkAction<TData>[];
  // What the page header's Export button downloads, as CSV, when the page
  // wraps its header and table in an ExportProvider; the file is named
  // after it. The selected rows if any, else every row the table holds.
  exportFileName?: string;
  // A server list's page of every row that matches the filters
  // (useServerDataTable fills it from the list's fetch). With it, Export
  // reads them all, a page at a time, instead of the page on screen; one
  // export runs at a time, and leaving the page calls it off.
  exportAll?: (page: number) => Promise<ExportPage<TData>>;
  // A download the API builds (and audits) for every row that matches,
  // taken instead of exportAll when nothing is selected.
  exportHref?: () => string;
  // Columns only the CSV has, after the table's own.
  exportColumns?: readonly DataTableExportColumn<TData>[];
  search?: DataTableSearchConfig;
  filters?: DataTableFiltersConfig;
  // Presence flips the table into server-managed mode for that concern.
  sorting?: { state: SortingState; onSortingChange: (state: SortingState) => void };
  pagination?: {
    state: PaginationState;
    onPaginationChange: (state: PaginationState) => void;
    // The URL asked for a page past the end (a stale link, rows deleted
    // since): put it on the last page, without a history entry.
    onPastEnd?: (lastPage: number) => void;
  };
  meta?: PaginationMeta;
  // The list's own page size; rows per page offers it beside 10/25/50/100.
  initialPageSize?: number;
}
