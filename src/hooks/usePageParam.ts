"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { pageHref, readPageParam } from "@/lib/table/pageParams";

// For client-side lists (rows already loaded, sliced with paginate()) that
// keep their page in the URL, so a refresh, a shared link or Back lands on
// the same page.
//
// Updates use window.history.pushState, not router.push, like
// useServerManagedDataTable: the rows are already here, so there is nothing
// to fetch. router.push would re-run the route's Server Component (every
// reader on the page) on each click and only show the new page after that
// round-trip. pushState changes the URL at once, Next keeps useSearchParams
// in sync with it, and it never scrolls, so the pager keeps the reader in
// place.
export function usePageParam(key = "page") {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const page = readPageParam(searchParams, key);

  const setPage = useCallback(
    (next: number) => {
      const href = pageHref(pathname, searchParams, next, key);
      const query = searchParams.toString();
      // Skip a push that wouldn't change the URL (an extra Back step).
      if (href === (query ? `${pathname}?${query}` : pathname)) return;
      window.history.pushState(null, "", href);
    },
    [pathname, searchParams, key],
  );

  return { page, setPage };
}
