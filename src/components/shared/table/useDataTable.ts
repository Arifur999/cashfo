"use client";

import {
  functionalUpdate,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
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

const NO_HIDDEN_COLUMNS: readonly string[] = [];

// One shared empty array: a fresh `[]` per render would look like new data
// every time, re-triggering TanStack's automatic page reset -- a state update
// that can fire before the table has even mounted.
const EMPTY_ROWS: never[] = [];

// Builds the TanStack table instance for DataTable. Every concern is
// in-memory by default; passing `sorting` / `pagination` / server
// search+filters flips just that concern to manual (URL-driven) mode.
export function useDataTable<TData>({
  data,
  columns,
  getRowId,
  getSubRows,
  tableId,
  defaultHiddenColumns = NO_HIDDEN_COLUMNS,
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
  // Tree rows start fully expanded (`true` = every row).
  const [expanded, setExpanded] = useState<ExpandedState>(true);
  const defaultVisibility = useMemo<VisibilityState>(
    () => Object.fromEntries(defaultHiddenColumns.map((columnId) => [columnId, false])),
    [defaultHiddenColumns],
  );
  const [columnVisibility, setColumnVisibility] = usePersistentState<VisibilityState>(
    tableId ? `data-table:${tableId}:columns` : undefined,
    defaultVisibility,
  );

  const allColumns = useMemo<ColumnDef<TData>[]>(
    () => [
      ...(enableRowSelection ? [createSelectColumn<TData>()] : []),
      ...columns,
      ...(actions ? [createActionsColumn(actions)] : []),
    ],
    [columns, actions, enableRowSelection],
  );

  // Narrowing the rows always starts again from page 1 (done here instead of
  // TanStack's autoResetPageIndex, see below).
  const resetToFirstPage = () => setLocalPagination((current) => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }));

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is intentionally used here and React Compiler already skips memoization for this hook.
  const table = useReactTable({
    data: data ?? EMPTY_ROWS,
    columns: allColumns,
    getRowId,
    getSubRows,
    state: {
      sorting: sorting?.state ?? localSorting,
      pagination: pagination?.state ?? localPagination,
      columnFilters,
      globalFilter,
      rowSelection,
      expanded,
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
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      resetToFirstPage();
    },
    onGlobalFilterChange: (value: string) => {
      setGlobalFilter(value);
      resetToFirstPage();
    },
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: setColumnVisibility,
    defaultColumn: { filterFn: smartColumnFilterFn as FilterFn<TData> },
    globalFilterFn: "includesString",
    enableRowSelection,
    // The backend can't sort its paginated lists, so sorting one page in
    // memory would only mislead; such tables simply don't offer sorting.
    enableSorting: !isServerPaginated || isServerSorted,
    manualPagination: isServerPaginated,
    // Off: TanStack schedules that reset in a microtask during render, which
    // under StrictMode's double render fires before the table has mounted
    // ("Can't perform a React state update on a component that hasn't
    // mounted yet"). Filters reset the page themselves (resetToFirstPage).
    autoResetPageIndex: false,
    manualSorting: isServerSorted,
    manualFiltering: isServerFiltered,
    // Tree data: a parent stays when one of its children matches, and a page
    // holds top-level rows with their children inline.
    filterFromLeafRows: Boolean(getSubRows),
    paginateExpandedRows: false,
    pageCount: isServerPaginated ? Math.max(meta?.totalPage ?? 1, 1) : undefined,
    rowCount: isServerPaginated ? meta?.total : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // When the in-memory rows shrink (a delete, a narrower filter), don't leave
  // the table parked on a page that no longer exists. Adjusting state during
  // render is React's pattern for this; it re-renders before painting.
  const lastPageIndex = Math.max(table.getPageCount() - 1, 0);
  if (!isServerPaginated && localPagination.pageIndex > lastPageIndex) {
    setLocalPagination({ ...localPagination, pageIndex: lastPageIndex });
  }

  return table;
}
