import { canAccessRoute, canManage, type ManageArea } from "./authUtils";
import type { IconName } from "./iconMapper";
import type { AdminRole } from "@/types/auth.types";

// A count beside a menu item: work waiting there, shown to roles that can
// act on it.
export type NavBadgeKind = "openTickets" | "securityFlags";

// A tab under a page's header, as that page's TabsNav draws it: the menu's
// third level, which the breadcrumb names ("Security › Sign-ins").
export interface NavTab {
  title: string;
  href: string;
  // Only its own path: a first tab whose path the others extend
  // (/admin/security is the audit log, /admin/security/logins the sign-ins).
  exact?: boolean;
}

export interface NavItem {
  // Plain English key, translated at render time through useLocale() --
  // this config is module-scope data and can't react to a locale change.
  title: string;
  href: string;
  icon: IconName;
  // The page's tabs, first one first. Their paths light this item up too,
  // for a section spread over several routes (Plans & coupons is /plans
  // and /coupons).
  tabs?: NavTab[];
  // What a role must be allowed to change to edit here: one area, or every
  // area the page holds (on Users a support admin suspends people and a
  // finance admin changes their plan). A role that can change none of them
  // sees the page with a lock, read-only.
  manage?: ManageArea | ManageArea[];
  badge?: NavBadgeKind;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const ADMIN_USERS_ROUTE = "/admin/users";

// The admin menu as the design's AdminSidebar groups it. Adding an admin
// page = a route folder + one entry here (a tab of an existing page = one
// entry in its tabs). Who can see an item is NOT declared here: it comes
// from the route table in authUtils, so the sidebar and proxy.ts can never
// disagree.
export const adminNavSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/admin/dashboard", icon: "House" },
      { title: "Analytics", href: "/admin/analytics", icon: "ChartColumn" },
    ],
  },
  {
    title: "People",
    items: [
      { title: "Users", href: ADMIN_USERS_ROUTE, icon: "Users", manage: ["ownerStatus", "ownerPlan"] },
      { title: "Workspaces", href: "/admin/workspaces", icon: "Building2" },
      // Resetting an owner's data is all this page changes.
      { title: "Owners", href: "/admin/manage-owners", icon: "Crown", manage: "ownerData" },
    ],
  },
  {
    title: "Money",
    items: [
      {
        title: "Plans & coupons",
        href: "/admin/plans",
        icon: "Layers",
        manage: "subscriptions",
        tabs: [
          { title: "Plans", href: "/admin/plans" },
          { title: "Coupons", href: "/admin/coupons" },
        ],
      },
      {
        title: "Payments",
        href: "/admin/payments",
        icon: "CreditCard",
        manage: "payments",
        tabs: [
          { title: "Payments", href: "/admin/payments" },
          { title: "Invoices", href: "/admin/invoices" },
          { title: "Revenue", href: "/admin/revenue" },
        ],
      },
    ],
  },
  {
    title: "Support & content",
    items: [
      {
        title: "Support",
        href: "/admin/support",
        icon: "LifeBuoy",
        manage: "support",
        badge: "openTickets",
        tabs: [
          { title: "Tickets", href: "/admin/support" },
          { title: "Feature requests", href: "/admin/feature-requests" },
        ],
      },
      {
        title: "Content",
        href: "/admin/content",
        icon: "FileText",
        manage: "content",
        tabs: [
          { title: "Announcements", href: "/admin/content/announcements" },
          { title: "Legal pages", href: "/admin/content/legal" },
          { title: "Translations", href: "/admin/content/translations" },
          { title: "Categories", href: "/admin/content/categories" },
        ],
      },
      // No lock: any admin can draft or schedule a campaign here (the API
      // lets every admin create one), so no role only looks. Editing the
      // templates and sending or cancelling stay with their roles.
      {
        title: "Notifications",
        href: "/admin/notifications",
        icon: "Bell",
        tabs: [
          { title: "Templates", href: "/admin/notifications", exact: true },
          { title: "Campaigns", href: "/admin/notifications/campaigns" },
          { title: "Send history", href: "/admin/notifications/history" },
        ],
      },
    ],
  },
  {
    title: "Platform",
    items: [
      {
        title: "Security",
        href: "/admin/security",
        icon: "Shield",
        badge: "securityFlags",
        tabs: [
          { title: "Audit log", href: "/admin/security", exact: true },
          { title: "Sign-ins", href: "/admin/security/logins" },
          { title: "Suspicious activity", href: "/admin/security/flags" },
          { title: "Admin team", href: "/admin/security/admins" },
          { title: "Roles", href: "/admin/security/roles" },
        ],
      },
      {
        title: "System",
        href: "/admin/system",
        icon: "Server",
        tabs: [
          { title: "Health and backups", href: "/admin/system", exact: true },
          { title: "Feature flags", href: "/admin/system/feature-flags" },
          { title: "Errors", href: "/admin/system/errors" },
          { title: "Rate limits", href: "/admin/system/rate-limits" },
        ],
      },
      { title: "Settings", href: "/admin/settings", icon: "Settings", manage: "settings" },
    ],
  },
];

// The menu this role sees: the items, and the tabs, it may open.
export const getNavSectionsByRole = (role: AdminRole): NavSection[] =>
  adminNavSections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => canAccessRoute(item.href, role))
        .map((item) => (item.tabs ? { ...item, tabs: item.tabs.filter((tab) => canAccessRoute(tab.href, role)) } : item)),
    }))
    .filter((section) => section.items.length > 0);

const isUnder = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export const isNavItemActive = (item: NavItem, pathname: string) =>
  [item.href, ...(item.tabs ?? []).map((tab) => tab.href)].some((prefix) => isUnder(pathname, prefix));

// Where the item leads: its first tab, so Content opens straight on
// Announcements instead of bouncing off /admin/content's redirect.
export const navItemHref = (item: NavItem) => item.tabs?.[0]?.href ?? item.href;

const manageAreas = (item: NavItem): ManageArea[] => (item.manage === undefined ? [] : typeof item.manage === "string" ? [item.manage] : item.manage);

// Read-only for this role: the page opens, but the role may change none of
// what it holds.
export const isNavItemViewOnly = (item: NavItem, role: AdminRole) => {
  const areas = manageAreas(item);
  return areas.length > 0 && !areas.some((area) => canManage(role, area));
};

// The counts this role's menu shows: on items it can act on.
export const navBadgesFor = (sections: NavSection[], role: AdminRole): NavBadgeKind[] =>
  sections.flatMap((section) => section.items).flatMap((item) => (item.badge && !isNavItemViewOnly(item, role) ? [item.badge] : []));

export interface NavLocation {
  section: NavSection;
  item: NavItem;
  // The tab the path is on; null on a page without tabs.
  tab: NavTab | null;
}

const isOnTab = (tab: NavTab, pathname: string) => (tab.exact ? pathname === tab.href : isUnder(pathname, tab.href));

// The section, item and tab a path belongs to, for the top bar's
// breadcrumb. The longest tab path wins: /admin/security/logins is
// Sign-ins, not the audit log.
export const findAdminNavLocation = (pathname: string, sections: NavSection[] = adminNavSections): NavLocation | null => {
  for (const section of sections) {
    const item = section.items.find((candidate) => isNavItemActive(candidate, pathname));
    if (item) {
      const tab = (item.tabs ?? []).reduce<NavTab | null>((best, candidate) => (isOnTab(candidate, pathname) && (!best || candidate.href.length > best.href.length) ? candidate : best), null);
      return { section, item, tab };
    }
  }
  return null;
};

// "/admin/system/errors/" reads as "/admin/system/errors"; "/" stays.
export const trimTrailingSlash = (pathname: string) => pathname.replace(/(.)\/+$/, "$1");

// The id of a record page right under a list (/admin/users/<id>), or null.
export const recordIdUnder = (pathname: string, listHref: string): string | null => {
  const rest = pathname.startsWith(`${listHref}/`) ? pathname.slice(listHref.length + 1) : "";
  return rest && !rest.includes("/") ? rest : null;
};

export interface UserList {
  href: string;
  // The way back, on the user's page.
  back: string;
}

// A user's page opens from Users, Owners or Workspaces. Owners and
// Workspaces add ?from= to it, so the menu keeps their item lit, the
// breadcrumb names them and the way back leads to them.
const USER_LISTS = {
  users: { href: ADMIN_USERS_ROUTE, back: "All users" },
  owners: { href: "/admin/manage-owners", back: "All owners" },
  workspaces: { href: "/admin/workspaces", back: "All workspaces" },
} satisfies Record<string, UserList>;

export type UserOrigin = Exclude<keyof typeof USER_LISTS, "users">;

// hasOwn, so ?from=constructor can't reach Object.prototype.
export const userListFor = (from: string | null | undefined): UserList =>
  from && Object.hasOwn(USER_LISTS, from) ? USER_LISTS[from as keyof typeof USER_LISTS] : USER_LISTS.users;

export const userRecordHref = (userId: string, from?: UserOrigin) => `${ADMIN_USERS_ROUTE}/${encodeURIComponent(userId)}${from ? `?from=${from}` : ""}`;

// The path the menu lights up for: a user's page counts as the list it was
// opened from.
export const menuPathFor = (pathname: string, from: string | null | undefined) =>
  recordIdUnder(trimTrailingSlash(pathname), ADMIN_USERS_ROUTE) === null ? pathname : userListFor(from).href;
