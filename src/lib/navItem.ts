import { canAccessRoute, canManage, type ManageArea } from "./authUtils";
import type { IconName } from "./iconMapper";
import type { AdminRole } from "@/types/auth.types";

export interface NavItem {
  // Plain English key, translated at render time through useLocale() --
  // this config is module-scope data and can't react to a locale change.
  title: string;
  href: string;
  icon: IconName;
  // Extra path prefixes that also highlight this item, for a section that
  // spans several pages (Plans & coupons covers /plans and /coupons).
  activeMatch?: string[];
  // The area a role must be allowed to change to edit here; other roles
  // see the page with a lock, read-only.
  manage?: ManageArea;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// The admin menu as the design's AdminSidebar groups it. Adding an admin
// page = a route folder + one entry here. Who can see an item is NOT
// declared here: it comes from the route table in authUtils, so the
// sidebar and proxy.ts can never disagree.
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
      { title: "Users", href: "/admin/users", icon: "Users", manage: "ownerStatus" },
      { title: "Workspaces", href: "/admin/workspaces", icon: "Building2" },
      { title: "Owners", href: "/admin/manage-owners", icon: "Crown", manage: "ownerStatus" },
    ],
  },
  {
    title: "Money",
    items: [
      { title: "Plans & coupons", href: "/admin/plans", icon: "Layers", activeMatch: ["/admin/plans", "/admin/coupons"], manage: "subscriptions" },
      { title: "Payments", href: "/admin/payments", icon: "CreditCard", activeMatch: ["/admin/payments", "/admin/invoices", "/admin/revenue"], manage: "payments" },
    ],
  },
  {
    title: "Support & content",
    items: [
      { title: "Support", href: "/admin/support", icon: "LifeBuoy", activeMatch: ["/admin/support", "/admin/feature-requests"], manage: "support" },
      { title: "Content", href: "/admin/content", icon: "FileText", manage: "content" },
      { title: "Notifications", href: "/admin/notifications", icon: "Bell", manage: "notificationTemplates" },
    ],
  },
  {
    title: "Platform",
    items: [
      { title: "Security", href: "/admin/security", icon: "Shield" },
      { title: "System", href: "/admin/system", icon: "Server" },
      { title: "Settings", href: "/admin/settings", icon: "Settings", manage: "settings" },
    ],
  },
];

export const getNavSectionsByRole = (role: AdminRole): NavSection[] =>
  adminNavSections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccessRoute(item.href, role)) }))
    .filter((section) => section.items.length > 0);

export const isNavItemActive = (item: NavItem, pathname: string) =>
  (item.activeMatch ?? [item.href]).some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

// Read-only for this role: the page opens, but nothing on it can be changed.
export const isNavItemViewOnly = (item: NavItem, role: AdminRole) => item.manage !== undefined && !canManage(role, item.manage);

// The section and item a path belongs to, for the top bar's breadcrumb.
export const findAdminNavLocation = (pathname: string, sections: NavSection[] = adminNavSections): { section: NavSection; item: NavItem } | null => {
  for (const section of sections) {
    const item = section.items.find((candidate) => isNavItemActive(candidate, pathname));
    if (item) return { section, item };
  }
  return null;
};
