import { describe, expect, it } from "vitest";
import { adminCrumb, type AdminCrumb } from "./adminBreadcrumb";
import { getNavSectionsByRole } from "./navItem";

// Every admin page, as the top bar names it. A page of its own sits in its
// menu group (not a page, so no link); a tab sits under its page, which
// links to the page's first tab -- from that tab too.
const PAGES: [string, AdminCrumb][] = [
  ["/admin/dashboard", { parent: "Overview", page: "Dashboard" }],
  ["/admin/analytics", { parent: "Overview", page: "Analytics" }],
  ["/admin/users", { parent: "People", page: "Users" }],
  ["/admin/workspaces", { parent: "People", page: "Workspaces" }],
  ["/admin/manage-owners", { parent: "People", page: "Owners" }],
  ["/admin/plans", { parent: "Plans & coupons", parentHref: "/admin/plans", page: "Plans" }],
  ["/admin/coupons", { parent: "Plans & coupons", parentHref: "/admin/plans", page: "Coupons" }],
  // The Payments tab is the Payments page itself.
  ["/admin/payments", { parent: "Money", page: "Payments" }],
  ["/admin/invoices", { parent: "Payments", parentHref: "/admin/payments", page: "Invoices" }],
  ["/admin/revenue", { parent: "Payments", parentHref: "/admin/payments", page: "Revenue" }],
  ["/admin/support", { parent: "Support", parentHref: "/admin/support", page: "Tickets" }],
  ["/admin/feature-requests", { parent: "Support", parentHref: "/admin/support", page: "Feature requests" }],
  ["/admin/content/announcements", { parent: "Content", parentHref: "/admin/content/announcements", page: "Announcements" }],
  ["/admin/content/legal", { parent: "Content", parentHref: "/admin/content/announcements", page: "Legal pages" }],
  ["/admin/content/translations", { parent: "Content", parentHref: "/admin/content/announcements", page: "Translations" }],
  ["/admin/content/categories", { parent: "Content", parentHref: "/admin/content/announcements", page: "Categories" }],
  ["/admin/notifications", { parent: "Notifications", parentHref: "/admin/notifications", page: "Templates" }],
  ["/admin/notifications/campaigns", { parent: "Notifications", parentHref: "/admin/notifications", page: "Campaigns" }],
  ["/admin/notifications/history", { parent: "Notifications", parentHref: "/admin/notifications", page: "Send history" }],
  ["/admin/security", { parent: "Security", parentHref: "/admin/security", page: "Audit log" }],
  ["/admin/security/logins", { parent: "Security", parentHref: "/admin/security", page: "Sign-ins" }],
  ["/admin/security/flags", { parent: "Security", parentHref: "/admin/security", page: "Suspicious activity" }],
  ["/admin/security/admins", { parent: "Security", parentHref: "/admin/security", page: "Admin team" }],
  ["/admin/security/roles", { parent: "Security", parentHref: "/admin/security", page: "Roles" }],
  ["/admin/system", { parent: "System", parentHref: "/admin/system", page: "Health and backups" }],
  ["/admin/system/feature-flags", { parent: "System", parentHref: "/admin/system", page: "Feature flags" }],
  ["/admin/system/errors", { parent: "System", parentHref: "/admin/system", page: "Errors" }],
  ["/admin/system/rate-limits", { parent: "System", parentHref: "/admin/system", page: "Rate limits" }],
  ["/admin/settings", { parent: "Platform", page: "Settings" }],
  // My account's parent is the admin's own name.
  ["/admin/account", { parent: null, page: "My account" }],
];

describe("adminCrumb", () => {
  it.each(PAGES)("names %s from its place in the menu", (path, crumb) => {
    expect(adminCrumb(path)).toStrictEqual(crumb);
  });

  it("ignores a trailing slash", () => {
    expect(adminCrumb("/admin/system/errors/")).toStrictEqual({ parent: "System", parentHref: "/admin/system", page: "Errors" });
  });

  it("names a payment or a ticket from its id, under its linked list", () => {
    expect(adminCrumb("/admin/payments/9f3c2a1b-0000-4000-8000-000000000000")).toStrictEqual({ parent: "Payments", parentHref: "/admin/payments", page: "PAY-9F3C2A1B", record: true });
    expect(adminCrumb("/admin/support/ab12cd34-0000")).toStrictEqual({ parent: "Tickets", parentHref: "/admin/support", page: "#AB12C", record: true });
  });

  it("leaves a user's name or an invoice's number to the page", () => {
    expect(adminCrumb("/admin/users/u-1")).toStrictEqual({ parent: "Users", parentHref: "/admin/users", page: null, record: true });
    expect(adminCrumb("/admin/invoices/inv-1")).toStrictEqual({ parent: "Invoices", parentHref: "/admin/invoices", page: null, record: true });
  });

  it("puts a user under the list they were opened from", () => {
    expect(adminCrumb("/admin/users/u-1", { from: "owners" })).toStrictEqual({ parent: "Owners", parentHref: "/admin/manage-owners", page: null, record: true });
    expect(adminCrumb("/admin/users/u-1", { from: "workspaces" })).toStrictEqual({ parent: "Workspaces", parentHref: "/admin/workspaces", page: null, record: true });
    expect(adminCrumb("/admin/users/u-1", { from: "nowhere" })).toStrictEqual({ parent: "Users", parentHref: "/admin/users", page: null, record: true });
    // Only a user's page has an origin.
    expect(adminCrumb("/admin/payments/9f3c2a1b", { from: "owners" })?.parent).toBe("Payments");
  });

  it("shows a mistyped id as written instead of failing", () => {
    expect(adminCrumb("/admin/payments/%E0%A4%zz")?.page).toBe("PAY-%E0%A4%Z");
  });

  it("still places a page that doesn't exist under its menu entry", () => {
    expect(adminCrumb("/admin/users/u-1/extra")).toStrictEqual({ parent: "People", page: "Users" });
    expect(adminCrumb("/admin/notifications/campaigns/c-1")).toStrictEqual({ parent: "Notifications", parentHref: "/admin/notifications", page: "Campaigns" });
  });

  it("only knows the pages in the role's own menu", () => {
    expect(adminCrumb("/admin/security/logins", { sections: getNavSectionsByRole("SUPPORT_ADMIN") })).toBeNull();
    expect(adminCrumb("/admin/invoices", { sections: getNavSectionsByRole("SUPPORT_ADMIN") })).toStrictEqual({ parent: "Payments", parentHref: "/admin/payments", page: "Invoices" });
  });

  it("knows nothing about other paths", () => {
    expect(adminCrumb("/admin/unknown")).toBeNull();
    expect(adminCrumb("/dashboard")).toBeNull();
  });
});
