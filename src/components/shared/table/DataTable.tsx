"use client";

import DataTableContent from "./DataTableContent";
import DataTablePagination from "./DataTablePagination";
import DataTableSelectionBar from "./DataTableSelectionBar";
import DataTableToolbar from "./DataTableToolbar";
import type { DataTableProps } from "./dataTable.types";
import { useDataTable } from "./useDataTable";
import { useDataTableReset } from "./useDataTableReset";

// The single table component. Client-side by default (sorts, filters, pages
// and exports in memory); passing `pagination` / `sorting` / server search
// and filters flips that concern to server-managed mode. See
// dataTable.types.ts for every option.
const DataTable = <TData,>(props: DataTableProps<TData>) => {
  const {
    emptyMessage = "No results found.",
    isLoading = false,
    isFetching = false,
    onRowClick,
    toolbarAction,
    exportFileName,
    search,
    filters,
    bulkActions,
    pagination,
    meta,
  } = props;

  const table = useDataTable(props);
  const { canReset, reset } = useDataTableReset(table, search, filters);
  const totalRows = pagination ? (meta?.total ?? 0) : table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-3">
      <DataTableToolbar
        table={table}
        search={search}
        filters={filters}
        toolbarAction={toolbarAction}
        exportFileName={exportFileName}
      />
      <DataTableSelectionBar table={table} bulkActions={bulkActions} />
      <DataTableContent
        table={table}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage={emptyMessage}
        canReset={canReset}
        onReset={reset}
        onRowClick={onRowClick}
      />
      {totalRows > 0 && <DataTablePagination table={table} totalRows={totalRows} />}
    </div>
  );
};

export default DataTable;
