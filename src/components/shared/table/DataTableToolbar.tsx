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
  title?: string;
  search?: DataTableSearchConfig;
  filters?: DataTableFiltersConfig;
  toolbarAction?: React.ReactNode;
  exportFileName?: string;
}

const DataTableToolbar = <TData,>({ table, title, search, filters, toolbarAction, exportFileName }: DataTableToolbarProps<TData>) => {
  const { canReset, reset } = useDataTableReset(table, search, filters);
  const onServerSearch = search?.onDebouncedChange;
  const tabConfigs = filters?.configs.filter((config) => config.type === "tabs") ?? [];
  const chipConfigs = filters?.configs.filter((config) => config.type !== "tabs") ?? [];

  const resetButton = canReset && (
    <Button variant="ghost" size="sm" className="h-8 text-small text-ink-2" onClick={reset}>
      Reset
      <X aria-hidden="true" />
    </Button>
  );
  const chips = filters && chipConfigs.length > 0 && (
    <>
      <DataTableFilters table={table} filters={filters} configs={chipConfigs} />
      {resetButton}
    </>
  );

  // The design's list toolbar: the title or the status tabs (else the
  // filter chips) on the left, the search and the table tools on the right,
  // all inside the card. A list with tabs and chips puts the chips on a
  // second row.
  return (
    <div className="px-5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {title && <h2 className="text-title text-ink">{title}</h2>}
        {filters && tabConfigs.length > 0 ? (
          <>
            <DataTableFilters table={table} filters={filters} configs={tabConfigs} />
            {chipConfigs.length === 0 && resetButton}
          </>
        ) : (
          chips
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
      {tabConfigs.length > 0 && chips && <div className="mt-3 flex flex-wrap items-center gap-2">{chips}</div>}
    </div>
  );
};

export default DataTableToolbar;
