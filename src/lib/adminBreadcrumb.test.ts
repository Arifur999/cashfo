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
  ["/admin/manage-owners", { parent: "People", page: "Manage Owners" }],
  ["/admin/plans", { parent: "Subscriptions", parentHref: "/admin/plans", page: "Plans" }],
  ["/admin/coupons", { parent: "Subscriptions", parentHref: "/admin/plans", page: "Coupons" }],
  // The Payments tab is the Payments page itself.
  ["/admin/payments", { parent: "Money", page: "Payments" }],
  // Its three tabs keep the page's own name, as the boards title them.
  ["/admin/referrals", { parent: "Money", page: "Referrals & Payouts" }],
  ["/admin/referrals/list", { parent: "Money", page: "Referrals & Payouts" }],
  ["/admin/referrals/settings", { parent: "Money", page: "Referrals & Payouts" }],
  ["/admin/invoices", { parent: "Payments", parentHref: "/admin/payments", page: "Invoices" }],
  ["/admin/revenue", { parent: "Payments", parentHref: "/admin/payments", page: "Revenue" }],
  ["/admin/support", { parent: "Support & content", page: "Tickets" }],
  ["/admin/feature-requests", { parent: "Support & content", page: "Feature requests" }],
  ["/admin/content/announcements", { parent: "Support & content", page: "Announcements" }],
  ["/admin/content/legal", { parent: "Support & content", page: "Legal pages" }],
  ["/admin/content/translations", { parent: "Support & content", page: "Translations" }],
  ["/admin/content/categories", { parent: "Support & content", page: "Categories" }],
  ["/admin/notifications", { parent: "Support & content", page: "Templates" }],
  ["/admin/notifications/campaigns", { parent: "Support & content", page: "Campaigns" }],
  ["/admin/notifications/history", { parent: "Support & content", page: "Send history" }],
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
    expect(adminCrumb("/admin/users/u-1", { from: "owners" })).toStrictEqual({ parent: "Manage Owners", parentHref: "/admin/manage-owners", page: null, record: true });
    expect(adminCrumb("/admin/users/u-1", { from: "workspaces" })).toStrictEqual({ parent: "Workspaces", parentHref: "/admin/workspaces", page: null, record: true });
    expect(adminCrumb("/admin/users/u-1", { from: "nowhere" })).toStrictEqual({ parent: "Users", parentHref: "/admin/users", page: null, record: true });
    // Only a user's page has an origin.
    expect(adminCrumb("/admin/payments/9f3c2a1b", { from: "owners" })?.parent).toBe("Payments");
  });

  describe("a record opened from a list", () => {
    // The lists' own filters, as their table configs name them.
    const listKeys = {
      "/admin/users": ["search", "status", "planId"],
      "/admin/manage-owners": ["search", "status"],
      "/admin/support": ["status", "search", "priority"],
    };

    it("links back to the list as it was left, like the page's own way back", () => {
      expect(adminCrumb("/admin/users/u-1", { back: "status=SUSPENDED&search=rahim&page=3", listKeys })?.parentHref).toBe("/admin/users?status=SUSPENDED&search=rahim&page=3");
      expect(adminCrumb("/admin/users/u-1", { from: "owners", back: "status=ACTIVE&limit=50", listKeys })?.parentHref).toBe("/admin/manage-owners?status=ACTIVE&limit=50");
      expect(adminCrumb("/admin/support/ab12cd34-0000", { back: "status=DONE&priority=HIGH&page=2", listKeys })).toStrictEqual({
        parent: "Tickets",
        parentHref: "/admin/support?status=DONE&priority=HIGH&page=2",
        page: "#AB12C",
        record: true,
      });
    });

    it("keeps only the list's own params", () => {
      expect(adminCrumb("/admin/users/u-1", { from: "owners", back: "planId=p-1&next=%2F%2Fevil.com&status=", listKeys })?.parentHref).toBe("/admin/manage-owners");
      expect(adminCrumb("/admin/support/t-1", { back: "search=refund&assignedToAdminId=a-1", listKeys })?.parentHref).toBe("/admin/support?search=refund");
    });

    it("opens a list plain when its keys aren't given", () => {
      expect(adminCrumb("/admin/users/u-1", { from: "workspaces", back: "page=2", listKeys })?.parentHref).toBe("/admin/workspaces");
      expect(adminCrumb("/admin/users/u-1", { back: "page=2" })?.parentHref).toBe("/admin/users");
      expect(adminCrumb("/admin/payments/9f3c2a1b", { back: "status=FAILED", listKeys })?.parentHref).toBe("/admin/payments");
    });

    it("ignores ?back= on a page of its own", () => {
      expect(adminCrumb("/admin/users", { back: "status=ACTIVE", listKeys })).toStrictEqual({ parent: "People", page: "Users" });
    });
  });

  it("names a link by its path, whatever its query", () => {
    expect(adminCrumb("/admin/users?search=rahim%40example.com")).toStrictEqual({ parent: "People", page: "Users" });
    expect(adminCrumb("/admin/security/flags#f-1")).toStrictEqual({ parent: "Security", parentHref: "/admin/security", page: "Suspicious activity" });
  });

  it("shows a mistyped id as written instead of failing", () => {
    expect(adminCrumb("/admin/payments/%E0%A4%zz")?.page).toBe("PAY-%E0%A4%Z");
  });

  it("still places a page that doesn't exist under its menu entry", () => {
    expect(adminCrumb("/admin/users/u-1/extra")).toStrictEqual({ parent: "People", page: "Users" });
    expect(adminCrumb("/admin/notifications/campaigns/c-1")).toStrictEqual({ parent: "Support & content", page: "Campaigns" });
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
