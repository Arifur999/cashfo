"use client";

import type { PaginationState, SortingState } from "@tanstack/react-table";
import { usePathname, type ReadonlyURLSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { buildListQueryString } from "@/lib/queryString";

// replace: a correction (a page past the end) rather than a step that Back
// should undo.
export type UpdateParamsFn = (updater: (params: URLSearchParams) => void, options?: { resetPage?: boolean; replace?: boolean }) => void;

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
      const href = query ? `${pathname}?${query}` : pathname;
      if (options?.replace) window.history.replaceState(null, "", href);
      else window.history.pushState(null, "", href);
    },
    [pathname, searchParams],
  );

  // The page and limit exactly as buildListQueryString sends them, so the
  // pager can't disagree with the rows it shows: a typed ?limit=500 is 100
  // in both, ?limit=-5 the default.
  const sent = new URLSearchParams(buildListQueryString(searchParams, [], defaultLimit));
  const page = Number(sent.get("page"));
  const limit = Number(sent.get("limit"));
  const sortBy = searchParams.get("sortBy");
  const sortOrder = searchParams.get("sortOrder");

  const paginationState = useMemo<PaginationState>(() => ({ pageIndex: page - 1, pageSize: limit }), [page, limit]);
  const sortingState = useMemo<SortingState>(() => (sortBy ? [{ id: sortBy, desc: sortOrder === "desc" }] : []), [sortBy, sortOrder]);

  // Rows per page goes through here too, as the limit param (dropped when
  // it is the list's own size).
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

  // A page past the end goes to the last page in place, so Back doesn't
  // return to a page that isn't there.
  const handlePastEnd = useCallback(
    (lastPage: number) => {
      updateParams(
        (params) => {
          if (lastPage <= 1) params.delete("page");
          else params.set("page", String(lastPage));
        },
        { replace: true },
      );
    },
    [updateParams],
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

  return { paginationState, sortingState, updateParams, handlePaginationChange, handlePastEnd, handleSortingChange };
}
