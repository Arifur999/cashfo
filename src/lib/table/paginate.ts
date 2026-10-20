import { clampPage } from "./pageParams";

export interface PaginatedRows<T> {
  rows: T[];
  page: number;
  totalPages: number;
  total: number;
}

// One page of a list that is already fully loaded (contacts, loan payments).
// totalPages is 0 for an empty list, like the API's meta, and the page is
// clamped so a stale ?page= past the end shows the last page, not nothing.
// The size is capped at the total so a "show all" Infinity is one page, not
// 0 * Infinity = NaN slicing to an empty one.
export function paginate<T>(rows: readonly T[], page: number, size: number): PaginatedRows<T> {
  const total = rows.length;
  const perPage = Math.min(Math.max(Math.floor(size) || 1, 1), Math.max(total, 1));
  const totalPages = Math.ceil(total / perPage);
  const current = clampPage(page, totalPages);
  const start = (current - 1) * perPage;
  return { rows: rows.slice(start, start + perPage), page: current, totalPages, total };
}
