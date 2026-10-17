import { shortPaymentId } from "./payments";
import { shortTicketId } from "./tickets";

// What the admin top bar's breadcrumb says, as the design's AdminTopbar draws
// it: a muted parent, then the page. The parent is the menu group for a page
// of its own ("People › Users"), the page a tab belongs to ("Security ›
// Sign-ins") and the list a record comes from ("Users › Sharmin Akter").
// English keys, translated where they're drawn.
export interface AdminCrumb {
  // null on My account, whose parent is the admin's own name.
  parent: string | null;
  // The page, or the record a record page shows. null when only the page
  // knows it (a user's name, an invoice's number): it says so through
  // <BreadcrumbTitle>.
  page: string | null;
  // A record's name or id: shown as written, never translated.
  record?: boolean;
}

const PAGES: Record<string, AdminCrumb> = {
  "/admin/dashboard": { parent: "Overview", page: "Dashboard" },
  "/admin/analytics": { parent: "Overview", page: "Analytics" },
  "/admin/users": { parent: "People", page: "Users" },
  "/admin/workspaces": { parent: "People", page: "Workspaces" },
  "/admin/manage-owners": { parent: "People", page: "Owners" },
  "/admin/plans": { parent: "Money", page: "Plans" },
  "/admin/coupons": { parent: "Money", page: "Coupons" },
  "/admin/payments": { parent: "Money", page: "Payments" },
  "/admin/invoices": { parent: "Payments", page: "Invoices" },
  "/admin/revenue": { parent: "Payments", page: "Revenue" },
  "/admin/support": { parent: "Support & content", page: "Tickets" },
  "/admin/feature-requests": { parent: "Support & content", page: "Feature requests" },
  "/admin/content/announcements": { parent: "Support & content", page: "Announcements" },
  "/admin/content/legal": { parent: "Support & content", page: "Legal pages" },
  "/admin/content/translations": { parent: "Support & content", page: "Translations" },
  "/admin/content/categories": { parent: "Support & content", page: "Categories" },
  "/admin/notifications": { parent: "Support & content", page: "Templates" },
  "/admin/notifications/campaigns": { parent: "Support & content", page: "Campaigns" },
  "/admin/notifications/history": { parent: "Support & content", page: "Send history" },
  "/admin/security": { parent: "Security", page: "Audit log" },
  "/admin/security/logins": { parent: "Security", page: "Sign-ins" },
  "/admin/security/flags": { parent: "Security", page: "Suspicious activity" },
  "/admin/security/admins": { parent: "Security", page: "Admin team" },
  "/admin/security/roles": { parent: "Security", page: "Roles" },
  "/admin/system": { parent: "System", page: "Health and backups" },
  "/admin/system/feature-flags": { parent: "System", page: "Feature flags" },
  "/admin/system/errors": { parent: "System", page: "Errors" },
  "/admin/system/rate-limits": { parent: "System", page: "Rate limits" },
  "/admin/settings": { parent: "Platform", page: "Settings" },
  "/admin/account": { parent: null, page: "My account" },
};

// Record pages, by the list they belong to. Payments and tickets are named
// by their id, so the path is enough; users and invoices need the page.
const RECORDS: { prefix: string; parent: string; name?: (id: string) => string }[] = [
  { prefix: "/admin/users/", parent: "Users" },
  { prefix: "/admin/invoices/", parent: "Invoices" },
  { prefix: "/admin/payments/", parent: "Payments", name: shortPaymentId },
  { prefix: "/admin/support/", parent: "Tickets", name: shortTicketId },
];

export const adminCrumb = (pathname: string): AdminCrumb | null => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const page = PAGES[path];
  if (page) return page;

  for (const { prefix, parent, name } of RECORDS) {
    const id = path.startsWith(prefix) ? path.slice(prefix.length) : "";
    if (id && !id.includes("/")) {
      return { parent, page: name ? name(decodeURIComponent(id)) : null, record: true };
    }
  }
  return null;
};
