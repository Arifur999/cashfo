"use client";

import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import DataTableExpandToggle from "./DataTableExpandToggle";
import DataTableSearch from "./DataTableSearch";
import type { DataTableFilterConfig, DataTableFiltersConfig, DataTableSearchConfig } from "./dataTable.types";
import DataTableFilters from "./filters/DataTableFilters";
import { useDataTableReset } from "./useDataTableReset";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  title?: string;
  search?: DataTableSearchConfig;
  filters?: DataTableFiltersConfig;
  toolbarAction?: React.ReactNode;
  rows?: 1 | 2;
}

const DataTableToolbar = <TData,>({ table, title, search, filters, toolbarAction, rows = 1 }: DataTableToolbarProps<TData>) => {
  const { translate } = useLocale();
  const { canReset, reset } = useDataTableReset(table, search, filters);
  const onServerSearch = search?.onDebouncedChange;
  const configs = filters?.configs ?? [];
  const endConfigs = configs.filter((config) => config.align === "end");
  const startConfigs = configs.filter((config) => config.align !== "end");
  const tabConfigs = startConfigs.filter((config) => config.type === "tabs");
  const chipConfigs = startConfigs.filter((config) => config.type !== "tabs");
  // Two rows (Users): the tabs and the search above, the filter chips under
  // them. Otherwise everything shares one row and wraps when it must.
  const splitRows = rows === 2 && chipConfigs.length > 0;

  const resetButton = canReset && configs.length > 0 && (
    <Button variant="ghost" size="sm" className="h-8 text-small text-ink-2" onClick={reset}>
      {translate("Reset")}
      <X aria-hidden="true" />
    </Button>
  );
  const draw = (subset: DataTableFilterConfig[]) => filters && subset.length > 0 && <DataTableFilters table={table} filters={filters} configs={subset} />;

  // The design's list toolbar: the title, the status tabs and the filter
  // chips on the left; the end-placed filters, the search and the toolbar's
  // own action on the right, all inside the card.
  return (
    <div className="px-5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {title && <h2 className="text-title text-ink">{translate(title)}</h2>}
        {draw(tabConfigs)}
        {!splitRows && draw(chipConfigs)}
        {!splitRows && resetButton}
        <span className="flex-1" />
        {draw(endConfigs)}
        {search && (
          <DataTableSearch
            value={onServerSearch ? (search.initialValue ?? "") : String(table.getState().globalFilter ?? "")}
            onDebouncedChange={onServerSearch ?? ((value) => table.setGlobalFilter(value))}
            placeholder={search.placeholder}
            debounceMs={search.debounceMs}
            width={search.width}
          />
        )}
        <div className="flex items-center gap-2">
          <DataTableExpandToggle table={table} />
          {toolbarAction}
        </div>
      </div>
      {splitRows && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {draw(chipConfigs)}
          {resetButton}
        </div>
      )}
    </div>
  );
};

export default DataTableToolbar;
