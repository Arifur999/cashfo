"use client";

import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTableExpandToggle from "./DataTableExpandToggle";
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

  // The design's list toolbar: filter chips on the left, the search and
  // the table tools on the right, all inside the card.
  return (
    <div className="flex flex-wrap items-center gap-2 px-5 py-3">
      {filters && <DataTableFilters table={table} filters={filters} />}
      {canReset && (
        <Button variant="ghost" size="sm" className="h-8 text-small text-ink-2" onClick={reset}>
          Reset
          <X aria-hidden="true" />
        </Button>
      )}
      <span className="flex-1" />
      {search && (
        <DataTableSearch
          value={onServerSearch ? (search.initialValue ?? "") : String(table.getState().globalFilter ?? "")}
          onDebouncedChange={onServerSearch ?? ((value) => table.setGlobalFilter(value))}
          placeholder={search.placeholder}
          debounceMs={search.debounceMs}
        />
      )}
      <div className="flex items-center gap-2">
        <DataTableExpandToggle table={table} />
        {exportFileName && <DataTableExportButton table={table} fileName={exportFileName} />}
        <DataTableViewOptions table={table} />
        {toolbarAction}
      </div>
    </div>
  );
};

export default DataTableToolbar;
