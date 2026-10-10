import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import type { PaginationMeta } from "@/types/api.types";

export interface DataTableFilterOption {
  label: string;
  value: string;
  icon?: LucideIcon;
}

export type DataTableFilterConfig =
  | { id: string; type: "single-select"; label: string; options: DataTableFilterOption[] }
  | { id: string; type: "multi-select"; label: string; options: DataTableFilterOption[] }
  // Server-managed date ranges map onto two URL params, dateFrom/dateTo by
  // default (the convention every list endpoint uses).
  | { id: string; type: "date-range"; label: string; fromKey?: string; toKey?: string };

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

export interface DataTableSearchConfig {
  placeholder?: string;
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
  data: TData[];
  columns: ColumnDef<TData>[];
  getRowId?: (row: TData) => string;
  // Persists column visibility per table in localStorage when set.
  tableId?: string;
  // Column ids hidden until the admin turns them on from the View menu
  // (e.g. a field already shown inside another cell). Keep it module-level.
  defaultHiddenColumns?: readonly string[];
  actions?: DataTableActions<TData>;
  toolbarAction?: React.ReactNode;
  emptyMessage?: string;
  // First load (skeleton rows) vs background refetch (progress bar, rows stay).
  isLoading?: boolean;
  isFetching?: boolean;
  onRowClick?: (row: TData) => void;
  enableRowSelection?: boolean;
  bulkActions?: DataTableBulkAction<TData>[];
  // Enables the CSV export button; the file is named after it.
  exportFileName?: string;
  search?: DataTableSearchConfig;
  filters?: DataTableFiltersConfig;
  // Presence flips the table into server-managed mode for that concern.
  sorting?: { state: SortingState; onSortingChange: (state: SortingState) => void };
  pagination?: { state: PaginationState; onPaginationChange: (state: PaginationState) => void };
  meta?: PaginationMeta;
  initialPageSize?: number;
}
