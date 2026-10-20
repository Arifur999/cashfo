import { clampPage, pageRange } from "./pageParams";
import { ELLIPSIS_JUMP, getPageWindow } from "./pageWindow";

// One slot of the numbered window: a page, or an ellipsis that jumps
// ELLIPSIS_JUMP pages towards the start or the end.
export type PagerItem = { kind: "page"; page: number; current: boolean } | { kind: "jump"; direction: "earlier" | "later"; page: number };

export interface PagerModel {
  // Nothing to page through: the pager renders nothing at all.
  empty: boolean;
  // More than one page, so the controls show (one page is summary only).
  paged: boolean;
  current: number;
  totalPages: number;
  // "Showing 41–50 of 50".
  first: number;
  last: number;
  previous: number | null;
  next: number | null;
  items: PagerItem[];
}

// Everything smartly/Pagination draws, worked out from the list's meta. The
// page is clamped first, so a stale ?page=99 still reads "Page 5 of 5", and a
// meta with a missing totalPages falls back to counting the rows.
export const pagerModel = (page: number, totalPages: number, total: number, pageSize: number): PagerModel => {
  const count = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const size = Number.isFinite(pageSize) && pageSize >= 1 ? Math.floor(pageSize) : count;
  const pages = Number.isFinite(totalPages) && totalPages >= 1 ? Math.floor(totalPages) : Math.max(Math.ceil(count / Math.max(size, 1)), 1);
  const current = clampPage(page, pages);
  const { first, last } = pageRange(current, size, count);

  const items: PagerItem[] = getPageWindow(current, pages).map((item) =>
    typeof item === "number"
      ? { kind: "page", page: item, current: item === current }
      : item === "ellipsis-start"
        ? { kind: "jump", direction: "earlier", page: clampPage(current - ELLIPSIS_JUMP, pages) }
        : { kind: "jump", direction: "later", page: clampPage(current + ELLIPSIS_JUMP, pages) },
  );

  return {
    empty: count === 0,
    paged: count > 0 && pages > 1,
    current,
    totalPages: pages,
    first,
    last,
    previous: current > 1 ? current - 1 : null,
    next: current < pages ? current + 1 : null,
    items,
  };
};
