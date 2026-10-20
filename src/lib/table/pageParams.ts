import { toPositiveInt, type SearchParamsRecord } from "@/lib/queryString";

// A page's `searchParams` prop, or useSearchParams() on the client
// (ReadonlyURLSearchParams extends URLSearchParams).
export type PageParamsSource = URLSearchParams | SearchParamsRecord;

const isSearchParams = (source: PageParamsSource): source is URLSearchParams => typeof (source as URLSearchParams).getAll === "function";

// The key's value only when the URL names it exactly once. Next hands a
// repeated ?page=2&page=3 to the server as an array, so both shapes treat a
// repeat as unreadable and a server page and its client list never disagree.
const readSingle = (source: PageParamsSource, key: string): string | undefined => {
  if (isSearchParams(source)) {
    const values = source.getAll(key);
    return values.length === 1 ? values[0] : undefined;
  }
  const value = source[key];
  return typeof value === "string" ? value : undefined;
};

// Whole numbers only, never below 1, so 0, NaN or a fraction can't divide or
// slice into nonsense.
const toWhole = (value: number, fallback: number) => Math.floor(value) || fallback;

// Anything unreadable ("abc", "-3", "", a repeated key) opens the first page.
// Parsed like buildListQueryString, so "2.5" is page 2 there and here.
export const readPageParam = (source: PageParamsSource, key = "page"): number => toPositiveInt(readSingle(source, key), 1);

// Only a size the pager offers; a hand-typed ?limit=37 falls back.
export const readPageSizeParam = (source: PageParamsSource, allowed: readonly number[], fallback: number, key = "limit"): number => {
  const size = toPositiveInt(readSingle(source, key), fallback);
  return allowed.includes(size) ? size : fallback;
};

// An empty list still has page 1, so the result is never 0.
export const clampPage = (page: number, totalPages: number): number => {
  const last = Math.max(toWhole(totalPages, 1), 1);
  return Math.min(Math.max(toWhole(page, 1), 1), last);
};

// The "Showing 41–50 of 50" numbers. The page is clamped first: a stale
// ?page=99 used to print "Showing 981–50 of 50". The size is capped at the
// total, so a "show all" Infinity can't turn into NaN.
export const pageRange = (page: number, size: number, total: number): { first: number; last: number } => {
  const count = Math.max(toWhole(total, 0), 0);
  if (count === 0) {
    return { first: 0, last: 0 };
  }
  const perPage = Math.min(Math.max(toWhole(size, 1), 1), count);
  const current = clampPage(page, Math.ceil(count / perPage));
  return { first: (current - 1) * perPage + 1, last: Math.min(current * perPage, count) };
};

// Where a server page should redirect when the URL asks for a page past the
// end (rows were deleted, or a stale link). Never page 1 itself, so meta that
// says totalPages 0 with rows can't cause a redirect loop.
export const pastEnd = (page: number, totalPages: number, total: number): number | null => {
  if (!(total > 0)) {
    return null;
  }
  const last = Math.max(toWhole(totalPages, 1), 1);
  return page > last ? last : null;
};

// A link to another page of the same list that keeps its filters (repeated
// keys too). Page 1 drops the key so the first page has one canonical URL.
export const pageHref = (pathname: string, params: PageParamsSource, page: number, key = "page"): string => {
  const next = new URLSearchParams();
  if (isSearchParams(params)) {
    params.forEach((value, name) => next.append(name, value));
  } else {
    for (const [name, value] of Object.entries(params)) {
      if (value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) next.append(name, item);
    }
  }

  const target = Math.max(toWhole(page, 1), 1);
  if (target === 1) next.delete(key);
  else next.set(key, String(target));

  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
};
