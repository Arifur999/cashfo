"use client";

import type { Table } from "@tanstack/react-table";
import type { DataTableFilterConfig, DataTableFiltersConfig, DataTableFilterValue, DateRangeValue } from "../dataTable.types";
import DataTableDateRangeFilter from "./DataTableDateRangeFilter";
import DataTableFacetedFilter from "./DataTableFacetedFilter";
import DataTableTabsFilter from "./DataTableTabsFilter";
import DataTableTextFilter from "./DataTableTextFilter";
import DataTableToggleFilter from "./DataTableToggleFilter";

interface DataTableFiltersProps<TData> {
  table: Table<TData>;
  filters: DataTableFiltersConfig;
  // A subset of filters.configs to draw here (the toolbar puts the tabs
  // and the chips on different rows); every config by default.
  configs?: DataTableFilterConfig[];
}

const toSelection = (value: DataTableFilterValue | undefined): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value) return [value];
  return [];
};

// Renders each configured filter in one of two modes:
// - server-managed: value/onFilterChange come from the URL-backed hook
// - in-memory: reads/writes the matching column's filter state, and gets
//   per-option counts from TanStack's faceting for free
const DataTableFilters = <TData,>({ table, filters, configs = filters.configs }: DataTableFiltersProps<TData>) => {
  const { onFilterChange } = filters;
  const isServerManaged = Boolean(onFilterChange);

  const getValue = (config: DataTableFilterConfig): DataTableFilterValue | undefined =>
    isServerManaged
      ? filters.values?.[config.id]
      : (table.getColumn(config.id)?.getFilterValue() as DataTableFilterValue | undefined);

  const setValue = (config: DataTableFilterConfig, value: DataTableFilterValue | undefined) => {
    if (onFilterChange) {
      onFilterChange(config.id, value);
      return;
    }
    table.getColumn(config.id)?.setFilterValue(value);
  };

  // Server single-value filters are a plain string in the URL; in-memory
  // filters always store an array.
  const setSingle = (config: DataTableFilterConfig, value: string | undefined) =>
    setValue(config, isServerManaged ? value : value ? [value] : undefined);

  return (
    <>
      {configs.map((config) => {
        if (config.type === "date-range") {
          return (
            <DataTableDateRangeFilter
              key={config.id}
              title={config.label}
              value={getValue(config) as DateRangeValue | undefined}
              onChange={(value) => setValue(config, value)}
            />
          );
        }

        if (config.type === "text") {
          return (
            <DataTableTextFilter
              key={config.id}
              label={config.label}
              width={config.width}
              value={toSelection(getValue(config))[0]}
              onChange={(value) => setValue(config, value)}
            />
          );
        }

        if (config.type === "toggle") {
          return <DataTableToggleFilter key={config.id} label={config.label} value={toSelection(getValue(config))[0]} onChange={(value) => setSingle(config, value)} />;
        }

        if (config.type === "tabs") {
          return (
            <DataTableTabsFilter
              key={config.id}
              label={config.label}
              options={config.options}
              allLabel={config.allLabel}
              value={toSelection(getValue(config))[0]}
              onChange={(value) => setSingle(config, value)}
            />
          );
        }

        const multiple = config.type === "multi-select";
        return (
          <DataTableFacetedFilter
            key={config.id}
            title={config.label}
            options={config.options}
            multiple={multiple}
            selected={toSelection(getValue(config))}
            facets={isServerManaged ? undefined : table.getColumn(config.id)?.getFacetedUniqueValues()}
            onChange={(values) => {
              if (!multiple) {
                setSingle(config, values[0]);
                return;
              }
              setValue(config, values.length > 0 ? values : undefined);
            }}
          />
        );
      })}
    </>
  );
};

export default DataTableFilters;
