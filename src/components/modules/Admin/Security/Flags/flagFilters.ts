import type { ReadonlyURLSearchParams } from "next/navigation";
import { isOpenFlag } from "@/lib/securityFlags";
import { type ISecurityFlag, SEVERITIES, type Severity } from "@/types/securityFlag.types";

export type FlagView = "open" | "closed" | "all";

// Suspicious activity's Status and Severity chips. They live in the address
// bar (?status=closed&severity=HIGH&severity=CRITICAL), so coming Back from
// "See the tries" or sharing the link keeps them.
export interface FlagFilters {
  view: FlagView;
  severities: Severity[];
}

export const DEFAULT_FLAG_FILTERS: FlagFilters = { view: "open", severities: [] };

const VIEWS: readonly string[] = ["open", "closed", "all"];

type Params = URLSearchParams | ReadonlyURLSearchParams;

// What the URL asks for; anything unknown is dropped.
export const readFlagFilters = (params: Params): FlagFilters => {
  const view = params.get("status");
  const asked = params.getAll("severity");
  return {
    view: view !== null && VIEWS.includes(view) ? (view as FlagView) : DEFAULT_FLAG_FILTERS.view,
    severities: SEVERITIES.filter((severity) => asked.includes(severity)),
  };
};

// The URL for a set of filters: the page's other params kept, the default
// view left out.
export const withFlagFilters = (current: Params, filters: FlagFilters): URLSearchParams => {
  const params = new URLSearchParams(current.toString());
  params.delete("status");
  params.delete("severity");
  if (filters.view !== DEFAULT_FLAG_FILTERS.view) params.set("status", filters.view);
  for (const severity of filters.severities) params.append("severity", severity);
  return params;
};

// Whether a flag belongs on the board as filtered.
export const showsFlag = (flag: Pick<ISecurityFlag, "status" | "severity">, filters: FlagFilters) =>
  (filters.view === "all" || (filters.view === "open") === isOpenFlag(flag)) && (filters.severities.length === 0 || filters.severities.includes(flag.severity));

// "See the 9 tries" must not open on Sign-ins' last 24 hours: a flag stays
// open until someone looks, often for days. lib/securityFlags.ts names the
// window that reaches back to the flag's tries (from when it was raised), and
// that is kept; a link without one falls back to any time.
export const withTriesWindow = (href: string): string => {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  if (!params.has("within")) params.set("within", "all");
  return `${path}?${params.toString()}`;
};
