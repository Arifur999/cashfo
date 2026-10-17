import type { ReadonlyURLSearchParams } from "next/navigation";
import { endOfDayIso, startOfDayIso } from "./date";

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

// Day-precision URL values ("2026-10-31") are widened to whole days in the
// platform timezone on the way to the API, whose `lte: new Date(dateTo)`
// would otherwise stop at midnight UTC and silently drop the last day. The
// URL itself keeps the readable day.
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_BOUNDS: Record<string, (day: string) => string> = { dateFrom: startOfDayIso, dateTo: endOfDayIso };

const toApiValue = (key: string, value: string) => (DAY_BOUNDS[key] && DAY_PATTERN.test(value) ? DAY_BOUNDS[key](value) : value);

// Copies ONLY the keys an endpoint whitelists. The API validates queries with
// forbidNonWhitelisted, so one stray URL param (?utm_source=...) would 400 the
// whole list. Repeated keys are kept as repeated params.
export const buildQueryString = (source: ParamsSource, keys: readonly string[]): string => {
  const params = new URLSearchParams();
  for (const key of keys) {
    for (const value of readAll(source, key)) {
      if (value !== "") {
        params.append(key, toApiValue(key, value));
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

// What a list shows while the URL names nothing else ({ status: "ACTIVE" }
// opens Owners on its Active tab).
type Defaults = Readonly<Record<string, string>>;

const withDefaults = (source: ParamsSource, defaults: Defaults | undefined): ParamsSource => {
  const missing = Object.entries(defaults ?? {}).filter(([key]) => readAll(source, key).length === 0);
  if (missing.length === 0) {
    return source;
  }
  const record: SearchParamsRecord = Object.fromEntries(missing);
  const keys = typeof (source as URLSearchParams).keys === "function" ? [...(source as URLSearchParams).keys()] : Object.keys(source as SearchParamsRecord);
  for (const key of keys) record[key] = readAll(source, key);
  return record;
};

// buildListQueryString driven by a table's config (ServerDataTableConfig),
// so a page and its client table pass the exact same inputs.
export const buildTableQueryString = (source: ParamsSource, config: { queryKeys: readonly string[]; defaultLimit?: number; defaults?: Defaults }) =>
  buildListQueryString(withDefaults(source, config.defaults), config.queryKeys, config.defaultLimit);
