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
// dataTable.types.ts for every option. The toolbar, the rows and the pager
// sit in one card, as the design draws every admin list.
const DataTable = <TData,>(props: DataTableProps<TData>) => {
  const {
    emptyMessage = "No results found.",
    isLoading = false,
    isFetching = false,
    onRowClick,
    rowClassName,
    title,
    toolbarAction,
    footer,
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
    <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
      <DataTableToolbar
        table={table}
        title={title}
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
        rowClassName={rowClassName}
      />
      {totalRows > 0 && <DataTablePagination table={table} totalRows={totalRows} />}
      {footer && <div className="flex items-center gap-2 border-t border-line px-5 py-3 text-small text-ink-2">{footer}</div>}
    </section>
  );
};

export default DataTable;
