"use client";

import {
  functionalUpdate,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { smartColumnFilterFn } from "@/lib/table/filterFns";
import { ACTIONS_COLUMN_ID, createActionsColumn } from "./columns/createActionsColumn";
import { createSelectColumn, SELECT_COLUMN_ID } from "./columns/createSelectColumn";
import type { DataTableProps } from "./dataTable.types";

const DEFAULT_VISIBILITY: VisibilityState = {};

// Builds the TanStack table instance for DataTable. Every concern is
// in-memory by default; passing `sorting` / `pagination` / server
// search+filters flips just that concern to manual (URL-driven) mode.
export function useDataTable<TData>({
  data,
  columns,
  getRowId,
  tableId,
  actions,
  enableRowSelection = false,
  search,
  filters,
  sorting,
  pagination,
  meta,
  initialPageSize = 10,
}: DataTableProps<TData>) {
  const isServerPaginated = Boolean(pagination);
  const isServerSorted = Boolean(sorting);
  const isServerFiltered = Boolean(filters?.onFilterChange || search?.onDebouncedChange);

  const [localSorting, setLocalSorting] = useState<SortingState>([]);
  const [localPagination, setLocalPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: initialPageSize });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = usePersistentState<VisibilityState>(
    tableId ? `data-table:${tableId}:columns` : undefined,
    DEFAULT_VISIBILITY,
  );

  const allColumns = useMemo<ColumnDef<TData>[]>(
    () => [
      ...(enableRowSelection ? [createSelectColumn<TData>()] : []),
      ...columns,
      ...(actions ? [createActionsColumn(actions)] : []),
    ],
    [columns, actions, enableRowSelection],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is intentionally used here and React Compiler already skips memoization for this hook.
  return useReactTable({
    data,
    columns: allColumns,
    getRowId,
    state: {
      sorting: sorting?.state ?? localSorting,
      pagination: pagination?.state ?? localPagination,
      columnFilters,
      globalFilter,
      rowSelection,
      columnVisibility,
      columnPinning: {
        left: enableRowSelection ? [SELECT_COLUMN_ID] : [],
        right: actions ? [ACTIONS_COLUMN_ID] : [],
      },
    },
    onSortingChange: (updater) =>
      sorting ? sorting.onSortingChange(functionalUpdate(updater, sorting.state)) : setLocalSorting(updater),
    onPaginationChange: (updater) =>
      pagination ? pagination.onPaginationChange(functionalUpdate(updater, pagination.state)) : setLocalPagination(updater),
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    defaultColumn: { filterFn: smartColumnFilterFn as FilterFn<TData> },
    globalFilterFn: "includesString",
    enableRowSelection,
    // The backend can't sort its paginated lists, so sorting one page in
    // memory would only mislead; such tables simply don't offer sorting.
    enableSorting: !isServerPaginated || isServerSorted,
    manualPagination: isServerPaginated,
    manualSorting: isServerSorted,
    manualFiltering: isServerFiltered,
    pageCount: isServerPaginated ? Math.max(meta?.totalPage ?? 1, 1) : undefined,
    rowCount: isServerPaginated ? meta?.total : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });
}
