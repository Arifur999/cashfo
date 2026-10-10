"use client";

import type { Table } from "@tanstack/react-table";
import type { DataTableFiltersConfig, DataTableFilterValue, DataTableSearchConfig } from "./dataTable.types";

const isActiveValue = (value: DataTableFilterValue | undefined) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value !== "";
  return Boolean(value?.from || value?.to);
};

// One answer to "is anything narrowing this table, and how do I undo it?",
// shared by the toolbar's Reset button and the empty state's "Clear filters".
export function useDataTableReset<TData>(
  table: Table<TData>,
  search: DataTableSearchConfig | undefined,
  filters: DataTableFiltersConfig | undefined,
) {
  const isServerSearch = Boolean(search?.onDebouncedChange);
  const isServerFilters = Boolean(filters?.onFilterChange);

  const hasSearch = isServerSearch ? Boolean(search?.initialValue) : Boolean(table.getState().globalFilter);
  const hasFilters = isServerFilters
    ? Object.values(filters?.values ?? {}).some(isActiveValue)
    : table.getState().columnFilters.length > 0;

  const reset = () => {
    if (isServerFilters) {
      filters?.onClearAll?.();
    } else {
      table.resetColumnFilters();
    }
    if (isServerSearch) {
      search?.onDebouncedChange?.("");
    } else {
      table.setGlobalFilter("");
    }
  };

  return { canReset: hasSearch || hasFilters, reset };
}
