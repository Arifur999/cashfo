"use client";

import type { ReadonlyURLSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { UpdateParamsFn } from "./useServerManagedDataTable";

interface UseServerManagedDataTableSearchOptions {
  searchParams: ReadonlyURLSearchParams;
  updateParams: UpdateParamsFn;
  queryKey?: string;
}

// Trims, no-ops when unchanged, drops the param entirely when empty, and
// always resets to page 1 -- a new search typed on page 7 must land on page 1.
export function useServerManagedDataTableSearch({ searchParams, updateParams, queryKey = "search" }: UseServerManagedDataTableSearchOptions) {
  const searchTermFromUrl = searchParams.get(queryKey) ?? "";

  const handleDebouncedSearchChange = useCallback(
    (searchTerm: string) => {
      const trimmed = searchTerm.trim();
      if (trimmed === searchTermFromUrl) {
        return;
      }
      updateParams(
        (params) => {
          if (trimmed) params.set(queryKey, trimmed);
          else params.delete(queryKey);
        },
        { resetPage: true },
      );
    },
    [searchTermFromUrl, updateParams, queryKey],
  );

  return { searchTermFromUrl, handleDebouncedSearchChange };
}
