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
}

const NO_FILTERS: DataTableFilterConfig[] = [];

// Composes the URL-driven pagination, search and filter hooks into the props
// a DataTable needs, plus the query string to fetch with -- so a feature
// table is just useQuery + <DataTable {...dataTableProps} />.
export function useServerDataTable<TData>(config: ServerDataTableConfig) {
  const { filters = NO_FILTERS, search, defaultLimit = 10 } = config;
  const searchParams = useSearchParams();
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
