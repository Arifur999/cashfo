import { describe, expect, it } from "vitest";
import type { AdminRole } from "@/types/auth.types";
import { bnAdminScopeDictionary } from "./i18n/dictionary";
import {
  adminNavSections,
  findAdminNavLocation,
  getNavSectionsByRole,
  isNavItemActive,
  isNavItemViewOnly,
  listBackHref,
  menuPathFor,
  navBadgesFor,
  navItemHref,
  recordIdUnder,
  userListFor,
  userRecordHref,
  type NavItem,
} from "./navItem";

const ITEMS = adminNavSections.flatMap((section) => section.items);
const item = (title: string): NavItem => {
  const found = ITEMS.find((candidate) => candidate.title === title);
  if (!found) throw new Error(`No menu item ${title}`);
  return found;
};

// The items this role's own menu shows with a lock, in menu order.
const lockedFor = (role: AdminRole) =>
  getNavSectionsByRole(role)
    .flatMap((section) => section.items)
    .filter((candidate) => isNavItemViewOnly(candidate, role))
    .map((candidate) => candidate.title);

const litFor = (pathname: string, from: string | null = null) => ITEMS.filter((candidate) => isNavItemActive(candidate, menuPathFor(pathname, from))).map((candidate) => candidate.title);

// The menu, the breadcrumb and the way back all show these words.
describe("adminNavSections", () => {
  it("has Bangla for every group, item and tab", () => {
    const titles = adminNavSections.flatMap((section) => [section.title, ...section.items.flatMap((entry) => [entry.title, ...(entry.tabs ?? []).map((tab) => tab.title)])]);
    for (const title of titles) {
      expect(bnAdminScopeDictionary[title], title).toBeTruthy();
    }
  });

  it("has Bangla for every way back from a user's page", () => {
    for (const from of ["owners", "workspaces", null]) {
      const { back } = userListFor(from);
      expect(bnAdminScopeDictionary[back], back).toBeTruthy();
    }
  });
});

describe("isNavItemViewOnly", () => {
  it("locks an item only for a role that can change none of its areas", () => {
    expect(lockedFor("SUPER_ADMIN")).toEqual([]);
    // As the AdminSidebar board draws each role's menu.
    expect(lockedFor("SUPPORT_ADMIN")).toEqual(["Subscriptions", "Payments", "Referrals & Payouts", "Content", "Settings"]);
    expect(lockedFor("FINANCE_ADMIN")).toEqual(["Support", "Content", "Notifications", "Settings"]);
    expect(lockedFor("CONTENT_ADMIN")).toEqual(["User Management", "Manage Owners", "Subscriptions", "Payments", "Referrals & Payouts", "Support", "Settings"]);
  });

  it("opens Users to a support admin (suspending) and a finance admin (plans)", () => {
    expect(isNavItemViewOnly(item("User Management"), "SUPPORT_ADMIN")).toBe(false);
    expect(isNavItemViewOnly(item("User Management"), "FINANCE_ADMIN")).toBe(false);
    expect(isNavItemViewOnly(item("User Management"), "CONTENT_ADMIN")).toBe(true);
  });

  it("opens Manage Owners to the roles that act on the people it lists", () => {
    expect(isNavItemViewOnly(item("Manage Owners"), "SUPER_ADMIN")).toBe(false);
    expect(isNavItemViewOnly(item("Manage Owners"), "SUPPORT_ADMIN")).toBe(false);
    expect(isNavItemViewOnly(item("Manage Owners"), "CONTENT_ADMIN")).toBe(true);
  });

  it("locks Notifications only for a role that can neither edit templates nor send campaigns", () => {
    expect(isNavItemViewOnly(item("Notifications"), "SUPPORT_ADMIN")).toBe(false);
    expect(isNavItemViewOnly(item("Notifications"), "CONTENT_ADMIN")).toBe(false);
    expect(isNavItemViewOnly(item("Notifications"), "FINANCE_ADMIN")).toBe(true);
  });

  it("never locks a page with nothing to change", () => {
    expect(isNavItemViewOnly(item("Workspaces"), "CONTENT_ADMIN")).toBe(false);
    expect(isNavItemViewOnly(item("Dashboard"), "FINANCE_ADMIN")).toBe(false);
  });
});

describe("navBadgesFor", () => {
  it("gives a super admin every count", () => {
    expect(navBadgesFor(getNavSectionsByRole("SUPER_ADMIN"), "SUPER_ADMIN")).toEqual(["payoutRequests", "openTickets", "securityFlags"]);
  });

  it("gives a support admin the open tickets only: Security is not in their menu", () => {
    expect(navBadgesFor(getNavSectionsByRole("SUPPORT_ADMIN"), "SUPPORT_ADMIN")).toEqual(["openTickets"]);
  });

  it("gives no count on a page the role can only read", () => {
    expect(navBadgesFor(adminNavSections, "FINANCE_ADMIN")).toEqual(["payoutRequests", "securityFlags"]);
    expect(navBadgesFor(getNavSectionsByRole("CONTENT_ADMIN"), "CONTENT_ADMIN")).toEqual([]);
  });
});

describe("getNavSectionsByRole", () => {
  const paymentTabs = (role: AdminRole) =>
    getNavSectionsByRole(role)
      .flatMap((section) => section.items)
      .find((candidate) => candidate.title === "Payments")
      ?.tabs?.map((tab) => tab.title);

  it("leaves out the tabs a role can't open", () => {
    expect(paymentTabs("FINANCE_ADMIN")).toEqual(["Payments", "Invoices", "Revenue"]);
    expect(paymentTabs("SUPPORT_ADMIN")).toEqual(["Payments", "Invoices"]);
  });
});

describe("isNavItemActive", () => {
  it("lights an item on every tab and record under it", () => {
    expect(litFor("/admin/coupons")).toEqual(["Subscriptions"]);
    expect(litFor("/admin/referrals")).toEqual(["Referrals & Payouts"]);
    expect(litFor("/admin/invoices/inv-1")).toEqual(["Payments"]);
    expect(litFor("/admin/feature-requests")).toEqual(["Support"]);
    expect(litFor("/admin/security/logins")).toEqual(["Security"]);
  });

  it("matches whole path segments only", () => {
    expect(litFor("/admin/users-export")).toEqual([]);
  });
});

describe("menuPathFor", () => {
  it("keeps the list a user's page was opened from lit", () => {
    expect(litFor("/admin/users/u-1", "owners")).toEqual(["Manage Owners"]);
    expect(litFor("/admin/users/u-1", "workspaces")).toEqual(["Workspaces"]);
    expect(litFor("/admin/users/u-1/", "owners")).toEqual(["Manage Owners"]);
  });

  it("lights Users for a user's page opened anywhere else", () => {
    expect(litFor("/admin/users/u-1")).toEqual(["User Management"]);
    expect(litFor("/admin/users/u-1", "elsewhere")).toEqual(["User Management"]);
    expect(litFor("/admin/users/u-1", "constructor")).toEqual(["User Management"]);
  });

  it("ignores ?from= on any other page", () => {
    expect(litFor("/admin/users", "owners")).toEqual(["User Management"]);
    expect(litFor("/admin/payments/p-1", "owners")).toEqual(["Payments"]);
  });
});

describe("userRecordHref", () => {
  it("marks where the page was opened from", () => {
    expect(userRecordHref("u-1")).toBe("/admin/users/u-1");
    expect(userRecordHref("u-1", "owners")).toBe("/admin/users/u-1?from=owners");
    expect(userRecordHref("u-1", "workspaces")).toBe("/admin/users/u-1?from=workspaces");
  });

  it("carries the list's own query in ?back=", () => {
    expect(userRecordHref("u-1", undefined, "status=SUSPENDED&page=2")).toBe("/admin/users/u-1?back=status%3DSUSPENDED%26page%3D2");
    expect(userRecordHref("u-1", "owners", "search=rahim")).toBe("/admin/users/u-1?from=owners&back=search%3Drahim");
    expect(userRecordHref("u 1", "owners", "")).toBe("/admin/users/u%201?from=owners");
  });

  it("names the way back after that list", () => {
    expect(userListFor("owners")).toEqual({ href: "/admin/manage-owners", back: "All owners" });
    expect(userListFor("workspaces")).toEqual({ href: "/admin/workspaces", back: "All workspaces" });
    expect(userListFor(undefined)).toEqual({ href: "/admin/users", back: "All users" });
  });

  it("leads back to lists that are in the menu", () => {
    for (const from of ["owners", "workspaces", null] as const) {
      const { href } = userListFor(from);
      expect(ITEMS.some((candidate) => candidate.href === href), href).toBe(true);
    }
  });
});

describe("findAdminNavLocation", () => {
  const tabAt = (pathname: string) => findAdminNavLocation(pathname)?.tab?.title ?? null;

  it("finds the most specific tab", () => {
    expect(tabAt("/admin/security/logins")).toBe("Sign-ins");
    expect(tabAt("/admin/security")).toBe("Audit log");
    expect(tabAt("/admin/notifications/history")).toBe("Send history");
    expect(tabAt("/admin/support/t-1")).toBe("Tickets");
  });

  it("keeps a first tab to its own path when the others extend it", () => {
    expect(tabAt("/admin/security/anything")).toBeNull();
    expect(findAdminNavLocation("/admin/security/anything")?.item.title).toBe("Security");
  });
});

describe("navItemHref", () => {
  it("opens an item on its first tab", () => {
    expect(navItemHref(item("Content"))).toBe("/admin/content/announcements");
    expect(navItemHref(item("Payments"))).toBe("/admin/payments");
    expect(navItemHref(item("User Management"))).toBe("/admin/users");
  });
});

describe("listBackHref", () => {
  const keys = ["search", "status", "page", "limit"];

  it("returns to the list with its own params", () => {
    expect(listBackHref("/admin/users", "search=rahim&status=ACTIVE&page=2", keys)).toBe("/admin/users?search=rahim&status=ACTIVE&page=2");
    expect(listBackHref("/admin/users", ["status=BANNED", "status=ACTIVE"], keys)).toBe("/admin/users?status=BANNED");
  });

  it("drops anything that isn't the list's, and empty values", () => {
    expect(listBackHref("/admin/users", "redirect=%2F%2Fevil.com&search=&page=3", keys)).toBe("/admin/users?page=3");
    expect(listBackHref("/admin/users", "redirect=x", keys)).toBe("/admin/users");
  });

  it("is the bare list without ?back=", () => {
    expect(listBackHref("/admin/users", undefined, keys)).toBe("/admin/users");
    expect(listBackHref("/admin/users", null, keys)).toBe("/admin/users");
    expect(listBackHref("/admin/users", "", keys)).toBe("/admin/users");
  });
});

describe("recordIdUnder", () => {
  it("reads the one path segment under a list", () => {
    expect(recordIdUnder("/admin/users/u-1", "/admin/users")).toBe("u-1");
    expect(recordIdUnder("/admin/users", "/admin/users")).toBeNull();
    expect(recordIdUnder("/admin/users/u-1/extra", "/admin/users")).toBeNull();
    expect(recordIdUnder("/admin/users-x/u-1", "/admin/users")).toBeNull();
  });
});
