import type { PaginationMeta } from "@/types/api.types";

// What a DataTable shows a page of when the list names no size of its own.
export const DEFAULT_PAGE_SIZE = 10;

// The admin lists' rows-per-page choice.
export const PAGE_SIZES: readonly number[] = [10, 25, 50, 100];

// The choice for one list: a list whose own size isn't one of these (the
// logs' 20) keeps it on offer, so the reader can always pick it back.
export const pageSizeOptions = (defaultSize: number): number[] =>
  PAGE_SIZES.includes(defaultSize) ? [...PAGE_SIZES] : [...PAGE_SIZES, defaultSize].sort((a, b) => a - b);

// A server list asked for a page past its end (a stale link, rows deleted
// since): the last page to put in the URL instead, or null. An empty list
// (totalPage 0) has no last page to go to.
export const pastEndPage = (page: number, meta: Pick<PaginationMeta, "totalPage"> | undefined): number | null =>
  meta && meta.totalPage > 0 && page > meta.totalPage ? meta.totalPage : null;
