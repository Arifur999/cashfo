import type { ReadonlyURLSearchParams } from "next/navigation";

// What a page's `searchParams` prop resolves to.
export type SearchParamsRecord = Record<string, string | string[] | undefined>;

type ParamsSource = URLSearchParams | ReadonlyURLSearchParams | SearchParamsRecord;

const readAll = (source: ParamsSource, key: string): string[] => {
  if (typeof (source as URLSearchParams).getAll === "function") {
    return (source as URLSearchParams).getAll(key);
  }
  const value = (source as SearchParamsRecord)[key];
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const MAX_LIMIT = 100;

const toPositiveInt = (raw: string | undefined, fallback: number) => {
  const value = Math.floor(Number(raw));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

// Copies ONLY the keys an endpoint whitelists. The API validates queries with
// forbidNonWhitelisted, so one stray URL param (?utm_source=...) would 400 the
// whole list. Repeated keys are kept as repeated params.
export const buildQueryString = (source: ParamsSource, keys: readonly string[]): string => {
  const params = new URLSearchParams();
  for (const key of keys) {
    for (const value of readAll(source, key)) {
      if (value !== "") {
        params.append(key, value);
      }
    }
  }
  return params.toString();
};

// Same, for paginated lists: page and limit are always pinned (limit capped
// at the API's max of 100). The Server Component prefetch and the client
// table both call this, so they land on the identical query key -- which is
// what makes the hydrated data get used instead of refetched.
export const buildListQueryString = (source: ParamsSource, keys: readonly string[], defaultLimit = 10): string => {
  const page = toPositiveInt(readAll(source, "page")[0], 1);
  const limit = Math.min(toPositiveInt(readAll(source, "limit")[0], defaultLimit), MAX_LIMIT);
  const filters = buildQueryString(
    source,
    keys.filter((key) => key !== "page" && key !== "limit"),
  );
  return `page=${page}&limit=${limit}${filters ? `&${filters}` : ""}`;
};

// buildListQueryString driven by a table's config (ServerDataTableConfig),
// so a page and its client table pass the exact same inputs.
export const buildTableQueryString = (source: ParamsSource, config: { queryKeys: readonly string[]; defaultLimit?: number }) =>
  buildListQueryString(source, config.queryKeys, config.defaultLimit);
