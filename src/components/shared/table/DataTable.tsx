"use client";

import { Info } from "lucide-react";
import { useExportAction } from "@/components/shared/ExportAction";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import DataTableContent from "./DataTableContent";
import DataTablePagination from "./DataTablePagination";
import DataTableSelectionBar from "./DataTableSelectionBar";
import DataTableSimplePager from "./DataTableSimplePager";
import DataTableToolbar from "./DataTableToolbar";
import { exportTableCsv } from "./exportTableCsv";
import type { DataTableProps } from "./dataTable.types";
import { useDataTable } from "./useDataTable";
import { useDataTableReset } from "./useDataTableReset";

// The single table component. Client-side by default (sorts, filters and
// pages in memory); passing `pagination` / `sorting` / server search
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
    hideToolbar = false,
    toolbarRows,
    pager,
    exportFileName,
    search,
    filters,
    bulkActions,
    pagination,
    meta,
  } = props;

  const { translate } = useLocale();
  const table = useDataTable(props);
  const { canReset, reset } = useDataTableReset(table, search, filters);
  const totalRows = pagination ? (meta?.total ?? 0) : table.getFilteredRowModel().rows.length;
  useExportAction(exportFileName ? () => exportTableCsv(table, exportFileName) : null);

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
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
        canReset={canReset}
        onReset={reset}
        onRowClick={onRowClick}
        rowClassName={rowClassName}
      />
      {totalRows > 0 &&
        (pager ? (
          <DataTableSimplePager table={table} totalRows={totalRows} pager={pager} />
        ) : (
          table.getPageCount() > 1 && <DataTablePagination table={table} totalRows={totalRows} />
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
