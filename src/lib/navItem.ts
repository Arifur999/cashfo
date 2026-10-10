import { canAccessRoute } from "./authUtils";
import type { IconName } from "./iconMapper";
import type { AdminRole } from "@/types/auth.types";

export interface NavItem {
  // Plain English key, translated at render time through useLocale() --
  // this config is module-scope data and can't react to a locale change.
  title: string;
  href: string;
  icon: IconName;
  // Extra path prefixes that also highlight this item, for a section that
  // spans several pages (Subscriptions covers /plans and /coupons).
  activeMatch?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Adding an admin page = a route folder + one entry here. Who can see an
// item is NOT declared here: it comes from the route table in authUtils, so
// the sidebar and proxy.ts can never disagree.
export const adminNavSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/admin/dashboard", icon: "LayoutDashboard" },
      { title: "Analytics", href: "/admin/analytics", icon: "BarChart3" },
    ],
  },
  {
    title: "Customers",
    items: [
      { title: "User Management", href: "/admin/users", icon: "Users" },
      { title: "Workspaces", href: "/admin/workspaces", icon: "Layers" },
      { title: "Manage Owners", href: "/admin/manage-owners", icon: "UserCog" },
    ],
  },
  {
    title: "Billing",
    items: [
      { title: "Subscriptions", href: "/admin/plans", icon: "Tag", activeMatch: ["/admin/plans", "/admin/coupons"] },
      { title: "Payments", href: "/admin/payments", icon: "CreditCard", activeMatch: ["/admin/payments", "/admin/invoices"] },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Content", href: "/admin/content", icon: "FileText" },
      { title: "Support", href: "/admin/support", icon: "LifeBuoy", activeMatch: ["/admin/support", "/admin/feature-requests"] },
      { title: "Notifications", href: "/admin/notifications", icon: "Bell" },
    ],
  },
  {
    title: "Administration",
    items: [
      { title: "Security", href: "/admin/security", icon: "Shield" },
      { title: "System", href: "/admin/system", icon: "Server" },
      { title: "Settings", href: "/admin/settings", icon: "Settings" },
    ],
  },
];

export const getNavSectionsByRole = (role: AdminRole): NavSection[] =>
  adminNavSections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccessRoute(item.href, role)) }))
    .filter((section) => section.items.length > 0);

export const isNavItemActive = (item: NavItem, pathname: string) =>
  (item.activeMatch ?? [item.href]).some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
