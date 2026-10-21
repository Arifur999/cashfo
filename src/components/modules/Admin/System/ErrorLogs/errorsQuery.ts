import type { ReadonlyURLSearchParams } from "next/navigation";
import type { SearchParamsRecord } from "@/lib/queryString";
import { WHEN_OPTIONS } from "@/lib/timeWindows";
import { SEVERITIES, type Severity } from "@/types/securityFlag.types";
import { ERROR_SOURCES, type ErrorSource } from "@/types/system.types";

// The errors page loads one page of the API's largest size and groups it.
// (A plain module, so the Server Component page can build the same query
// string the client board uses.)
export const ERRORS_LOADED = 100;

export type ErrorStatus = "open" | "fixed" | "all";

// The board's chips: Status, From, Severity and When. They live in the
// address bar (?status=fixed&within=7d), so Back and a shared link keep them.
export interface ErrorFilters {
  status: ErrorStatus;
  source?: ErrorSource;
  severity?: Severity;
  within: string;
}

// It opens on what nobody has fixed yet, from any time: what the Errors
// tab's count counts, so the badge and the list agree.
export const DEFAULT_ERROR_FILTERS: ErrorFilters = { status: "open", within: "all" };

const STATUSES: readonly string[] = ["open", "fixed", "all"];
const WINDOWS: readonly string[] = WHEN_OPTIONS.map((option) => option.value);
const FILTER_KEYS = ["status", "source", "severity", "within"] as const;

type ParamsSource = URLSearchParams | ReadonlyURLSearchParams | SearchParamsRecord;

const firstValue = (source: ParamsSource, key: string): string | undefined => {
  if (typeof (source as URLSearchParams).get === "function") {
    return (source as URLSearchParams).get(key) ?? undefined;
  }
  const value = (source as SearchParamsRecord)[key];
  return Array.isArray(value) ? value[0] : value;
};

const oneOf = <T extends string>(value: string | undefined, allowed: readonly string[]): T | undefined =>
  value !== undefined && allowed.includes(value) ? (value as T) : undefined;

// The filters a URL asks for. Anything unknown (a hand-edited link) falls
// back to the default, rather than sending the API a value it refuses.
export const readErrorFilters = (source: ParamsSource): ErrorFilters => ({
  status: oneOf<ErrorStatus>(firstValue(source, "status"), STATUSES) ?? DEFAULT_ERROR_FILTERS.status,
  source: oneOf<ErrorSource>(firstValue(source, "source"), ERROR_SOURCES),
  severity: oneOf<Severity>(firstValue(source, "severity"), SEVERITIES),
  within: oneOf<string>(firstValue(source, "within"), WINDOWS) ?? DEFAULT_ERROR_FILTERS.within,
});

// The address bar for a set of filters: the page's other params kept, the
// defaults left out, so the plain URL is the default view.
export const withErrorFilters = (current: URLSearchParams | ReadonlyURLSearchParams, filters: ErrorFilters): URLSearchParams => {
  const params = new URLSearchParams(current.toString());
  for (const key of FILTER_KEYS) params.delete(key);
  if (filters.status !== DEFAULT_ERROR_FILTERS.status) params.set("status", filters.status);
  if (filters.source) params.set("source", filters.source);
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.within !== DEFAULT_ERROR_FILTERS.within) params.set("within", filters.within);
  return params;
};

// Older or other errors may still be open outside what the chips show.
export const narrowsErrors = (filters: ErrorFilters) => filters.within !== "all" || Boolean(filters.source) || Boolean(filters.severity);

const RESOLVED_PARAM: Record<ErrorStatus, string> = { open: "false", fixed: "true", all: "" };

export const errorsQueryString = (filters: ErrorFilters = DEFAULT_ERROR_FILTERS) => {
  const params = new URLSearchParams({ page: "1", limit: String(ERRORS_LOADED) });
  if (RESOLVED_PARAM[filters.status]) params.set("resolved", RESOLVED_PARAM[filters.status]);
  if (filters.source) params.set("source", filters.source);
  if (filters.severity) params.set("severity", filters.severity);
  params.set("within", filters.within);
  return params.toString();
};
