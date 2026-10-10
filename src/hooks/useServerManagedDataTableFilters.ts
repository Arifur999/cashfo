"use client";

import type { ReadonlyURLSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type {
  DataTableFilterConfig,
  DataTableFilterValue,
  DataTableFilterValues,
  DateRangeValue,
} from "@/components/shared/table/dataTable.types";
import type { UpdateParamsFn } from "./useServerManagedDataTable";

// How each filter is serialized into the URL -- the contract with the API:
//   single     ?status=PENDING
//   multi      ?gateway=BKASH&gateway=NAGAD   (repeated key)
//   dateRange  ?dateFrom=2026-01-01&dateTo=2026-01-31
export const serverManagedFilter = {
  single: (filterId: string, queryKey = filterId) => ({ filterId, type: "single" as const, queryKey }),
  multi: (filterId: string, queryKey = filterId) => ({ filterId, type: "multi" as const, queryKey }),
  dateRange: (filterId: string, fromKey = "dateFrom", toKey = "dateTo") => ({
    filterId,
    type: "dateRange" as const,
    fromKey,
    toKey,
  }),
};

export type ServerManagedFilterDefinition = ReturnType<(typeof serverManagedFilter)[keyof typeof serverManagedFilter]>;

// Derives the URL mapping from the same configs the toolbar renders, so a
// filter is declared once.
export const toServerFilterDefinitions = (configs: DataTableFilterConfig[]): ServerManagedFilterDefinition[] =>
  configs.map((config) => {
    if (config.type === "date-range") return serverManagedFilter.dateRange(config.id, config.fromKey, config.toKey);
    if (config.type === "multi-select") return serverManagedFilter.multi(config.id);
    return serverManagedFilter.single(config.id);
  });

const keysOf = (definition: ServerManagedFilterDefinition) =>
  definition.type === "dateRange" ? [definition.fromKey, definition.toKey] : [definition.queryKey];

interface UseServerManagedDataTableFiltersOptions {
  searchParams: ReadonlyURLSearchParams;
  definitions: ServerManagedFilterDefinition[];
  updateParams: UpdateParamsFn;
}

export function useServerManagedDataTableFilters({ searchParams, definitions, updateParams }: UseServerManagedDataTableFiltersOptions) {
  const filterValues = useMemo<DataTableFilterValues>(() => {
    const values: DataTableFilterValues = {};
    for (const definition of definitions) {
      if (definition.type === "single") {
        values[definition.filterId] = searchParams.get(definition.queryKey) ?? undefined;
      } else if (definition.type === "multi") {
        values[definition.filterId] = searchParams.getAll(definition.queryKey);
      } else {
        const range: DateRangeValue = {
          from: searchParams.get(definition.fromKey) ?? undefined,
          to: searchParams.get(definition.toKey) ?? undefined,
        };
        values[definition.filterId] = range.from || range.to ? range : undefined;
      }
    }
    return values;
  }, [searchParams, definitions]);

  // Every filter change starts again from page 1.
  const handleFilterChange = useCallback(
    (filterId: string, value: DataTableFilterValue | undefined) => {
      const definition = definitions.find((item) => item.filterId === filterId);
      if (!definition) {
        return;
      }
      updateParams(
        (params) => {
          keysOf(definition).forEach((key) => params.delete(key));
          if (definition.type === "single" && typeof value === "string" && value) {
            params.set(definition.queryKey, value);
          } else if (definition.type === "multi" && Array.isArray(value)) {
            value.forEach((item) => params.append(definition.queryKey, item));
          } else if (definition.type === "dateRange" && value && typeof value === "object" && !Array.isArray(value)) {
            if (value.from) params.set(definition.fromKey, value.from);
            if (value.to) params.set(definition.toKey, value.to);
          }
        },
        { resetPage: true },
      );
    },
    [definitions, updateParams],
  );

  const clearAllFilters = useCallback(() => {
    updateParams((params) => definitions.flatMap(keysOf).forEach((key) => params.delete(key)), { resetPage: true });
  }, [definitions, updateParams]);

  return { filterValues, handleFilterChange, clearAllFilters };
}
