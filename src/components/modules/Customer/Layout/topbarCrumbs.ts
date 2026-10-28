import { breadcrumbFor, type NavLeaf, type NavLocation } from "@/lib/customer/nav";
import { leafHref } from "@/lib/customer/paletteMatch";

// What the bar reads the URL's query through (useSearchParams() answers it).
type UrlQuery = { get(name: string): string | null; toString(): string };

// The top bar's breadcrumb as links: a section ("Habits", "Books") is only a
// heading, a group ("Balance") opens its first page, and on a record page
// the list it came from ("Transactions") opens again as it was left (its
// filters and page), from the address the bar saved on the way in, in this
// workspace.

export interface TopbarCrumb {
  // Untranslated, like the menu's labels.
  label: string;
  href?: string;
}

// Where a list's last address is kept for this tab (sessionStorage).
export const listUrlKey = (list: NavLeaf): string => `lastListUrl:${leafHref(list)}`;

// What that key holds: the address and the workspace it was left in. Its
// filters name that workspace's wallets and contacts, so another workspace
// (or another account signed in on this tab) must never reopen it.
export const savedListValue = (businessId: string, url: string): string => JSON.stringify({ businessId, url });

// The address a key holds, if it was saved in this workspace; null for
// another workspace's, an older plain value, or anything unreadable.
export function savedListUrl(stored: string | null, businessId: string | null): string | null {
  if (!stored || !businessId) return null;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { businessId: savedIn, url } = parsed as { businessId?: unknown; url?: unknown };
    return savedIn === businessId && typeof url === "string" ? url : null;
  } catch {
    return null;
  }
}

// The list a page belongs to: the menu entry it is filed under.
export const listOf = (location: NavLocation): NavLeaf => location.sub ?? location.item;

// The address worth saving when this URL is a list's own page (not a record
// under it), with its filters; null otherwise.
export function listVisitUrl(location: NavLocation | null, pathname: string, query: UrlQuery): string | null {
  if (!location) return null;
  const list = listOf(location);
  if (pathname !== list.href) return null;
  if (list.query && !Object.entries(list.query).every(([key, value]) => query.get(key) === value)) return null;
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

const PARSE_BASE = "http://list.invalid";

// A saved address, if it still opens this very list: same origin, same
// path, the list's own query values. Anything else (an older format, a
// value edited by hand) falls back to the list's plain address.
export function restoredListUrl(list: NavLeaf, saved: string | null): string {
  const plain = leafHref(list);
  if (!saved || !saved.startsWith("/") || saved.startsWith("//")) return plain;
  let url: URL;
  try {
    url = new URL(saved, PARSE_BASE);
  } catch {
    return plain;
  }
  if (url.origin !== PARSE_BASE || url.pathname !== list.href) return plain;
  if (list.query && !Object.entries(list.query).every(([key, value]) => url.searchParams.get(key) === value)) return plain;
  return `${url.pathname}${url.search}`;
}

// Where the list crumb leads while a page shows a record. From a record
// page under the list (`visitUrl` null), back to the list as it was left
// (`listUrl`, its restored address) or else its plain address. From a
// record shown on the list's own page (the vault's security checkup at
// ?checkup=1), to the plain list, which closes it; the page itself stays,
// with its state, since only the query changes. At the plain list's own
// address there is nothing to close: null, and the crumb stays text.
export function recordListHref(location: NavLocation, visitUrl: string | null, listUrl?: string): string | null {
  const plain = leafHref(listOf(location));
  if (visitUrl === null) return listUrl ?? plain;
  return visitUrl === plain ? null : plain;
}

// The parts before the page's own name. `listUrl` is where a record page's
// list crumb goes (recordListHref); without a record the trail is the
// group or section alone. A record under a page of its own leads with that
// page, not its section ("Group Expense › Flat 4B"). `linkList: false`
// leaves the list as text, for a record whose list crumb has nowhere to go
// (recordListHref's null).
export function topbarTrail(location: NavLocation, record: boolean, listUrl?: string, { linkList = true }: { linkList?: boolean } = {}): TopbarCrumb[] {
  const { crumbs, heading } = breadcrumbFor(location);
  const above = record && !location.sub ? [] : crumbs;
  const trail: TopbarCrumb[] = above.map((label) => (location.sub && label === location.item.label ? { label, href: leafHref(location.item) } : { label }));
  if (record) trail.push(linkList ? { label: heading, href: listUrl ?? leafHref(listOf(location)) } : { label: heading });
  return trail;
}
