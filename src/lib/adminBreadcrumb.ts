import {
  ADMIN_USERS_ROUTE,
  adminNavSections,
  findAdminNavLocation,
  LIST_PAGE_KEYS,
  listBackHref,
  navItemHref,
  recordIdUnder,
  trimTrailingSlash,
  userListFor,
  type NavLocation,
  type NavSection,
} from "./navItem";
import { shortPaymentId } from "./payments";
import { shortTicketId } from "./tickets";

// What the admin top bar's breadcrumb says, as the design's AdminTopbar draws
// it: a muted parent, then the page. One rule, read off the menu: a page
// shows the last two levels of its place there -- its menu group for a page
// of its own ("People › Users"), the page for one of its tabs ("Payments ›
// Invoices", "Security › Sign-ins") -- and a record shows the list it was
// opened from ("Users › Sharmin Akter"). The parent is a link whenever it is
// a page, so it reads the same on every tab. English keys, translated where
// they're drawn.
export interface AdminCrumb {
  // null on My account, whose parent is the admin's own name.
  parent: string | null;
  // Where the parent leads. Absent for a menu group (no page of its own).
  parentHref?: string;
  // The page, or the record a record page shows. null when only the page
  // knows it (a user's name, an invoice's number): it says so through
  // <BreadcrumbTitle>.
  page: string | null;
  // A record's name or id: shown as written, never translated.
  record?: boolean;
}

const ACCOUNT_ROUTE = "/admin/account";

// The lists whose rows open a page of their own. Payments and tickets are
// named by their id, so the path is enough; users and invoices need the page.
const RECORD_LISTS: { href: string; name?: (id: string) => string }[] = [
  { href: ADMIN_USERS_ROUTE },
  { href: "/admin/invoices" },
  { href: "/admin/payments", name: shortPaymentId },
  { href: "/admin/support", name: shortTicketId },
];

// The menu's name for exactly this path. A tab wins over the item that
// shares its path: /admin/support is the Tickets list.
const titleAt = (href: string, sections: NavSection[]): string | null => {
  for (const item of sections.flatMap((section) => section.items)) {
    const tab = item.tabs?.find((candidate) => candidate.href === href);
    if (tab) return tab.title;
    if (item.href === href) return item.crumb ?? item.title;
  }
  return null;
};

// A broken escape in a typed URL shows as it came instead of throwing.
const decodeId = (id: string) => {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
};

// What each record list keeps in its URL besides the page and rows per page
// (its table config's queryKeys), by the list's href. A record page's
// ?back= is read against it, so the parent link returns to the same rows.
export type ListQueryKeys = Readonly<Partial<Record<string, readonly string[]>>>;

// Where a record page was opened from: its ?from= and ?back=.
export interface RecordOrigin {
  from?: string | null;
  back?: string | null;
  listKeys?: ListQueryKeys;
}

const recordCrumb = (path: string, { from, back, listKeys }: RecordOrigin, sections: NavSection[]): AdminCrumb | null => {
  for (const { href, name } of RECORD_LISTS) {
    const id = recordIdUnder(path, href);
    if (id === null) continue;
    // A user's page sits under the list it was opened from.
    const listHref = href === ADMIN_USERS_ROUTE ? userListFor(from).href : href;
    const list = titleAt(listHref, sections);
    if (list === null) return null;
    // The list as it was left, the same way the page's own way back reads
    // ?back=; a list whose keys aren't given opens plain.
    const keys = listKeys?.[listHref];
    const parentHref = back && keys ? listBackHref(listHref, back, [...keys, ...LIST_PAGE_KEYS]) : listHref;
    return { parent: list, parentHref, page: name ? name(decodeId(id)) : null, record: true };
  }
  return null;
};

const pageCrumb = ({ section, item, tab }: NavLocation): AdminCrumb => {
  // A page without tabs sits in its menu group, and a tab named like its
  // page is that page (Payments' own list): the group is no page to link to.
  // So are the tabs of an item the boards file under its group ("Support &
  // content › Tickets").
  if (!tab || tab.title === item.title) return { parent: section.title, page: item.crumb ?? item.title };
  if (item.crumbFromGroup) return { parent: section.title, page: tab.title };
  // The page links to its first tab, from that tab too.
  return { parent: item.title, parentHref: navItemHref(item), page: tab.title };
};

// The crumb for a path in this role's menu. `from` is the page's ?from=,
// which says where a user's page was opened from; `back` its ?back=, the
// list's query it was opened with, kept on the parent link for the lists
// `listKeys` names. A link with a query or a hash (an audit entry's "Go
// to") is named by its path.
export const adminCrumb = (
  pathname: string,
  { from, back, listKeys, sections = adminNavSections }: RecordOrigin & { sections?: NavSection[] } = {},
): AdminCrumb | null => {
  const path = trimTrailingSlash(pathname.replace(/[?#].*$/, ""));
  if (path === ACCOUNT_ROUTE) return { parent: null, page: "My account" };

  const location = findAdminNavLocation(path, sections);
  // A path the menu names itself is that page, never a record of a list.
  const named = location !== null && (location.tab?.href ?? location.item.href) === path;
  const record = named ? null : recordCrumb(path, { from, back, listKeys }, sections);
  // Anything else under a menu entry (a page that doesn't exist) still says
  // where in the menu it is.
  return record ?? (location && pageCrumb(location));
};
