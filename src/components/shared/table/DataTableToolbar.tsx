"use client";

import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTableExportButton from "./DataTableExportButton";
import DataTableSearch from "./DataTableSearch";
import DataTableViewOptions from "./DataTableViewOptions";
import type { DataTableFiltersConfig, DataTableSearchConfig } from "./dataTable.types";
import DataTableFilters from "./filters/DataTableFilters";
import { useDataTableReset } from "./useDataTableReset";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  search?: DataTableSearchConfig;
  filters?: DataTableFiltersConfig;
  toolbarAction?: React.ReactNode;
  exportFileName?: string;
}

const DataTableToolbar = <TData,>({ table, search, filters, toolbarAction, exportFileName }: DataTableToolbarProps<TData>) => {
  const { canReset, reset } = useDataTableReset(table, search, filters);
  const onServerSearch = search?.onDebouncedChange;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {search && (
          <DataTableSearch
            value={onServerSearch ? (search.initialValue ?? "") : String(table.getState().globalFilter ?? "")}
            onDebouncedChange={onServerSearch ?? ((value) => table.setGlobalFilter(value))}
            placeholder={search.placeholder}
            debounceMs={search.debounceMs}
          />
        )}
        {filters && <DataTableFilters table={table} filters={filters} />}
        {canReset && (
          <Button variant="ghost" size="sm" className="h-8" onClick={reset}>
            Reset
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {exportFileName && <DataTableExportButton table={table} fileName={exportFileName} />}
        <DataTableViewOptions table={table} />
        {toolbarAction}
      </div>
    </div>
  );
};

export default DataTableToolbar;
