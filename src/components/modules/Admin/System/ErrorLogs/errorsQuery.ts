import type { ErrorSource } from "@/types/system.types";
import type { Severity } from "@/types/securityFlag.types";

// The errors page loads one page of the API's largest size and groups it.
// (A plain module, so the Server Component page can build the same query
// string the client board uses.)
export const ERRORS_LOADED = 100;

export type ErrorStatus = "open" | "fixed" | "all";

// The board's chips: Status, From, Severity and When. It opens on what is
// not fixed yet, from anywhere, of any severity, in the last 24 hours.
export interface ErrorFilters {
  status: ErrorStatus;
  source?: ErrorSource;
  severity?: Severity;
  within: string;
}

export const DEFAULT_ERROR_FILTERS: ErrorFilters = { status: "open", within: "24h" };

const RESOLVED_PARAM: Record<ErrorStatus, string> = { open: "false", fixed: "true", all: "" };

export const errorsQueryString = (filters: ErrorFilters = DEFAULT_ERROR_FILTERS) => {
  const params = new URLSearchParams({ page: "1", limit: String(ERRORS_LOADED) });
  if (RESOLVED_PARAM[filters.status]) params.set("resolved", RESOLVED_PARAM[filters.status]);
  if (filters.source) params.set("source", filters.source);
  if (filters.severity) params.set("severity", filters.severity);
  params.set("within", filters.within);
  return params.toString();
};
