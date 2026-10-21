"use client";

import { Info } from "lucide-react";
import { useId } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import DataTableContent from "./DataTableContent";
import DataTablePagination from "./DataTablePagination";
import DataTableSelectionBar from "./DataTableSelectionBar";
import DataTableSimplePager from "./DataTableSimplePager";
import DataTableToolbar from "./DataTableToolbar";
import type { DataTableProps } from "./dataTable.types";
import { DEFAULT_PAGE_SIZE } from "./tablePaging";
import { useDataTable } from "./useDataTable";
import { useDataTableReset } from "./useDataTableReset";
import { useTableExport } from "./useTableExport";

// The single table component. Client-side by default (sorts, filters and
// pages in memory); passing `pagination` / `sorting` / server search
// and filters flips that concern to server-managed mode. See
// dataTable.types.ts for every option. The toolbar, the rows and the pager
// sit in one card, as the design draws every admin list; a failed read
// (isError) draws its error in the rows' place, under the toolbar.
const DataTable = <TData,>(props: DataTableProps<TData>) => {
  const {
    emptyMessage = "No results found.",
    emptyAction,
    isLoading = false,
    isFetching = false,
    isError = false,
    onRetry,
    errorTitle = "Couldn't load this list",
    errorDescription,
    onRowClick,
    rowHref,
    rowClassName,
    title,
    toolbarAction,
    footer,
    hideToolbar = false,
    layout,
    toolbarRows,
    pager,
    exportFileName,
    exportAll,
    exportColumns,
    getRowId,
    search,
    filters,
    bulkActions,
    pagination,
    meta,
    initialPageSize = DEFAULT_PAGE_SIZE,
  } = props;

  const { translate } = useLocale();
  // The card the pager brings back into view (and focuses the table in)
  // after a page change.
  const listId = useId();
  const table = useDataTable(props);
  const { canReset, reset } = useDataTableReset(table, search, filters);
  const totalRows = pagination ? (meta?.total ?? 0) : table.getFilteredRowModel().rows.length;
  useTableExport(table, { exportFileName, exportAll, exportColumns, getRowId });

  return (
    <section id={listId} className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
      {!hideToolbar && (
        <DataTableToolbar
          table={table}
          title={title}
          search={search}
          filters={filters}
          toolbarAction={toolbarAction}
          rows={toolbarRows}
        />
      )}
      <DataTableSelectionBar table={table} bulkActions={bulkActions} />
      <DataTableContent
        table={table}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage={emptyMessage}
        emptyAction={emptyAction}
        canReset={canReset}
        onReset={reset}
        isError={isError}
        onRetry={onRetry}
        errorTitle={errorTitle}
        errorDescription={errorDescription}
        onRowClick={onRowClick}
        rowHref={rowHref}
        rowClassName={rowClassName}
        layout={layout}
      />
      {totalRows > 0 &&
        (pager ? (
          <DataTableSimplePager table={table} totalRows={totalRows} pager={pager} defaultPageSize={initialPageSize} focusTargetId={listId} />
        ) : (
          <DataTablePagination table={table} totalRows={totalRows} defaultPageSize={initialPageSize} focusTargetId={listId} />
        ))}
      {/* The design's note under a list, behind an (i). */}
      {footer && (
        <div className="flex items-center gap-2 border-t border-line px-5 py-3 text-small text-ink-2">
          <Info className="size-3.75 shrink-0 text-ink-muted" aria-hidden="true" />
          <span>{typeof footer === "string" ? translate(footer) : footer}</span>
        </div>
      )}
    </section>
  );
};

export default DataTable;
