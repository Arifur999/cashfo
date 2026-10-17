"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { DataTableFilterConfig, DataTableProps } from "@/components/shared/table/dataTable.types";
import { buildTableQueryString } from "@/lib/queryString";
import { useServerManagedDataTable } from "./useServerManagedDataTable";
import { toServerFilterDefinitions, useServerManagedDataTableFilters } from "./useServerManagedDataTableFilters";
import { useServerManagedDataTableSearch } from "./useServerManagedDataTableSearch";

// Declared once per list (module scope, so it's stable) and shared by the
// page's prefetch and the client table.
export interface ServerDataTableConfig {
  // Every query param the endpoint accepts besides page/limit.
  queryKeys: readonly string[];
  filters?: DataTableFilterConfig[];
  search?: { placeholder: string; queryKey?: string; width?: "sm" | "md" };
  defaultLimit?: number;
  // What the list shows while the URL names nothing else; a tabs filter
  // with a default has no "All" tab.
  defaults?: Readonly<Record<string, string>>;
}

const NO_FILTERS: DataTableFilterConfig[] = [];

// Composes the URL-driven pagination, search and filter hooks into the props
// a DataTable needs, plus the query string to fetch with -- so a feature
// table is just useQuery + <DataTable {...dataTableProps} />.
export function useServerDataTable<TData>(config: ServerDataTableConfig) {
  const { filters: configFilters = NO_FILTERS, search, defaultLimit = 10, defaults } = config;
  const searchParams = useSearchParams();
  // Tabs and single choices learn which option stands in for an empty URL.
  const filters = useMemo(
    () =>
      configFilters.map((filter) =>
        (filter.type === "tabs" || filter.type === "single-select" || filter.type === "sort") && defaults?.[filter.id] ? { ...filter, defaultValue: defaults[filter.id] } : filter,
      ),
    [configFilters, defaults],
  );
  const definitions = useMemo(() => toServerFilterDefinitions(filters), [filters]);

  const { paginationState, updateParams, handlePaginationChange } = useServerManagedDataTable({ searchParams, defaultLimit });
  const { searchTermFromUrl, handleDebouncedSearchChange } = useServerManagedDataTableSearch({
    searchParams,
    updateParams,
    queryKey: search?.queryKey,
  });
  const { filterValues, handleFilterChange, clearAllFilters } = useServerManagedDataTableFilters({
    searchParams,
    definitions,
    updateParams,
  });

  const queryString = buildTableQueryString(searchParams, config);

  const dataTableProps: Pick<DataTableProps<TData>, "pagination" | "search" | "filters" | "initialPageSize"> = {
    initialPageSize: defaultLimit,
    pagination: { state: paginationState, onPaginationChange: handlePaginationChange },
    search: search
      ? { initialValue: searchTermFromUrl, placeholder: search.placeholder, width: search.width, onDebouncedChange: handleDebouncedSearchChange }
      : undefined,
    filters:
      filters.length > 0
        ? { configs: filters, values: filterValues, onFilterChange: handleFilterChange, onClearAll: clearAllFilters }
        : undefined,
  };

  return { queryString, dataTableProps };
}
