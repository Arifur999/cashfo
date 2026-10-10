"use client";

import type { PaginationState, SortingState } from "@tanstack/react-table";
import { usePathname, type ReadonlyURLSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export type UpdateParamsFn = (updater: (params: URLSearchParams) => void, options?: { resetPage?: boolean }) => void;

interface UseServerManagedDataTableOptions {
  searchParams: ReadonlyURLSearchParams;
  defaultLimit?: number;
}

// The URL is the single source of truth for page, limit and sort.
//
// Updates use window.history.pushState, not router.push: the URL changes
// instantly with no navigation or scroll reset, Next keeps useSearchParams in
// sync with it, and the table's useQuery picks up the new key -- keeping the
// previous rows on screen (keepPreviousData) until the next page arrives.
export function useServerManagedDataTable({ searchParams, defaultLimit = 10 }: UseServerManagedDataTableOptions) {
  const pathname = usePathname();

  const updateParams = useCallback<UpdateParamsFn>(
    (updater, options) => {
      const params = new URLSearchParams(searchParams.toString());
      updater(params);
      if (options?.resetPage) {
        params.delete("page");
      }
      const query = params.toString();
      window.history.pushState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams],
  );

  const page = Math.max(Math.floor(Number(searchParams.get("page"))) || 1, 1);
  const limit = Math.max(Math.floor(Number(searchParams.get("limit"))) || defaultLimit, 1);
  const sortBy = searchParams.get("sortBy");
  const sortOrder = searchParams.get("sortOrder");

  const paginationState = useMemo<PaginationState>(() => ({ pageIndex: page - 1, pageSize: limit }), [page, limit]);
  const sortingState = useMemo<SortingState>(() => (sortBy ? [{ id: sortBy, desc: sortOrder === "desc" }] : []), [sortBy, sortOrder]);

  const handlePaginationChange = useCallback(
    (next: PaginationState) => {
      updateParams((params) => {
        const nextPage = next.pageIndex + 1;
        if (nextPage <= 1) params.delete("page");
        else params.set("page", String(nextPage));
        if (next.pageSize === defaultLimit) params.delete("limit");
        else params.set("limit", String(next.pageSize));
      });
    },
    [updateParams, defaultLimit],
  );

  // A new sort always starts from page 1.
  const handleSortingChange = useCallback(
    (next: SortingState) => {
      updateParams(
        (params) => {
          const [first] = next;
          if (!first) {
            params.delete("sortBy");
            params.delete("sortOrder");
            return;
          }
          params.set("sortBy", first.id);
          params.set("sortOrder", first.desc ? "desc" : "asc");
        },
        { resetPage: true },
      );
    },
    [updateParams],
  );

  return { paginationState, sortingState, updateParams, handlePaginationChange, handleSortingChange };
}
