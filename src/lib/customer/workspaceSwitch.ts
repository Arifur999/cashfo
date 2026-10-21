import { CUSTOMER_HOME_ROUTE, safeRedirectPath, UNLOCK_WORKSPACE_ROUTE } from "@/lib/authUtils";
import type { UserBusiness, WorkspaceType } from "./api";

// Plain rules for opening another workspace, shared by the server (the
// layout, the switch action) and the switchers in the browser.

// A personal or business workspace can be the open one. A GROUP workspace
// is a shared mess or family book: it opens from Group expenses by its own
// URL and is never switched into.
export const isSwitchableWorkspace = (business: Pick<UserBusiness, "type">): boolean => business.type !== "GROUP";

export const switchableWorkspaces = <T extends Pick<UserBusiness, "type">>(businesses: T[]): T[] => businesses.filter(isSwitchableWorkspace);

// The workspace an id may open: one of the account's own personal or
// business workspaces, matched exactly. A group, an id that isn't theirs
// or a near miss opens nothing. The id is the browser's word (the switch
// action) or the cookie's (the stored choice), so it is never trusted to
// be anything at all.
export const switchTarget = <T extends Pick<UserBusiness, "id" | "type">>(businesses: T[], businessId: unknown): T | undefined =>
  typeof businessId === "string" ? switchableWorkspaces(businesses).find((business) => business.id === businessId) : undefined;

// The personal workspace is literally named "Personal" in the database; it
// reads as the account holder's name wherever it is shown.
export const workspaceName = (business: Pick<UserBusiness, "isDefault" | "name">, userName: string): string => (business.isDefault ? userName : business.name);

// How every switcher lists them: the account's own personal workspace
// first, then the rest A to Z. One fixed collation, so the server and the
// browser put them in the same order.
export function orderWorkspaces<T extends Pick<UserBusiness, "isDefault" | "name">>(businesses: T[]): T[] {
  return [...businesses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true }));
}

// The Books pages, which only a business workspace has.
export const BUSINESS_ONLY_ROUTES = ["/accounts", "/contacts", "/dena-pawna", "/transactions/advanced"];

const isUnder = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export const isBusinessOnlyPath = (pathname: string): boolean => BUSINESS_ONLY_ROUTES.some((route) => isUnder(pathname, route));

export const CHOOSE_WORKSPACE_ROUTE = "/choose-workspace";

// Pages outside the app that a switch or a chooser must never land on: the
// chooser itself and the PIN page would only send the visitor round again.
const NOT_A_LANDING = [CHOOSE_WORKSPACE_ROUTE, UNLOCK_WORKSPACE_ROUTE];

// A record lives in the workspace it was opened in, so after a switch its
// page would say "not found"; the switch lands on its list instead.
const RECORD_LISTS: { pattern: RegExp; list: string }[] = [
  { pattern: /^\/transactions\/(?!advanced(?:\/|$))[^/]+(?:\/|$)/, list: "/transactions" },
  { pattern: /^\/contacts\/[^/]+(?:\/|$)/, list: "/contacts" },
  { pattern: /^\/accounts\/[^/]+(?:\/|$)/, list: "/accounts" },
  { pattern: /^\/habit-tracker\/habits\/namaz\/[^/]+(?:\/|$)/, list: "/habit-tracker/habits?category=Namaz" },
  { pattern: /^\/habit-tracker\/habits\/ramadan\/[^/]+(?:\/|$)/, list: "/habit-tracker/habits?category=Ramadan" },
  { pattern: /^\/habit-tracker\/habits\/others\/[^/]+(?:\/|$)/, list: "/habit-tracker/habits?category=Others" },
  { pattern: /^\/group-expenses\/[^/]+(?:\/|$)/, list: "/group-expenses" },
];

// The query values that describe a view (a period, a tab, a habit page),
// never a record. Anything else -- a wallet or contact id, a page number
// past the other workspace's end -- stays behind.
const VIEW_PARAMS = new Set(["category", "range", "period", "dateFrom", "dateTo", "year", "month", "day", "tab", "type"]);

const PARSE_BASE = "http://landing.invalid";

// A same-origin path in the customer app (see safeRedirectPath), or null.
// The workspace pages themselves don't count.
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== "string") return null;
  const safe = safeRedirectPath(next, "user", "USER");
  if (!safe) return null;
  const { pathname } = new URL(safe, PARSE_BASE);
  return NOT_A_LANDING.some((route) => isUnder(pathname, route)) ? null : safe;
}

// Where a switch made on `from` lands: the same page with its view kept,
// except that a record's page goes to its list, and a Books page goes home
// unless the new workspace is a business. Anything that isn't a page of
// the app goes home.
export function landingAfterSwitch(from: string | null | undefined, targetType: WorkspaceType): string {
  const safe = safeNextPath(from);
  if (!safe) return CUSTOMER_HOME_ROUTE;
  const url = new URL(safe, PARSE_BASE);
  const list = RECORD_LISTS.find((record) => record.pattern.test(url.pathname))?.list;
  const pathname = list ? new URL(list, PARSE_BASE).pathname : url.pathname;
  if (targetType !== "BUSINESS" && isBusinessOnlyPath(pathname)) return CUSTOMER_HOME_ROUTE;
  if (list) return list;
  const view = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (VIEW_PARAMS.has(key)) view.append(key, value);
  }
  const query = view.toString();
  return query ? `${pathname}?${query}` : pathname;
}

// The chooser, coming back to `next` once a workspace is picked. Home needs
// no mention: the chooser goes there anyway.
export function chooseWorkspaceHref(next?: string | null): string {
  const safe = safeNextPath(next);
  return safe && safe !== CUSTOMER_HOME_ROUTE ? `${CHOOSE_WORKSPACE_ROUTE}?next=${encodeURIComponent(safe)}` : CHOOSE_WORKSPACE_ROUTE;
}

interface ChoiceState {
  // The stored choice still names one of the account's workspaces.
  remembered: boolean;
  // How many workspaces there are to choose from.
  choices: number;
  // A super admin's read-only "View as customer" session.
  viewAs: boolean;
}

// Whether the app asks "Which workspace?" before it opens: only when there
// is a real choice and none is remembered on this device. Once one is
// picked the cookie remembers it, so it is asked once. An admin viewing a
// customer is never asked; they see the default.
export const needsWorkspaceChoice = ({ remembered, choices, viewAs }: ChoiceState): boolean => !remembered && choices > 1 && !viewAs;
