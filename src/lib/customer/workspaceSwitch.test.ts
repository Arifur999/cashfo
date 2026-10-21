import { describe, expect, it } from "vitest";
import type { UserBusiness } from "./api";
import { NAV_SECTIONS } from "./nav";
import {
  BUSINESS_ONLY_ROUTES,
  chooseWorkspaceHref,
  isBusinessOnlyPath,
  landingAfterSwitch,
  needsWorkspaceChoice,
  orderWorkspaces,
  safeNextPath,
  switchableWorkspaces,
  switchTarget,
  workspaceName,
} from "./workspaceSwitch";

const workspace = (id: string, overrides: Partial<UserBusiness> = {}): UserBusiness => ({
  id,
  name: id,
  type: "BUSINESS",
  currency: "BDT",
  role: "OWNER",
  isDefault: false,
  hasPinLock: false,
  trialEndsAt: null,
  ...overrides,
});

describe("switchableWorkspaces / orderWorkspaces", () => {
  const personal = workspace("p", { name: "Personal", type: "PERSONAL", isDefault: true });
  const zebra = workspace("z", { name: "zebra traders" });
  const alpha = workspace("a", { name: "Alpha Store" });
  const shop2 = workspace("s2", { name: "Shop 10" });
  const shop1 = workspace("s1", { name: "Shop 9" });
  const mess = workspace("g", { name: "Aaa mess", type: "GROUP" });

  it("leaves groups out", () => {
    expect(switchableWorkspaces([mess, personal, zebra]).map((b) => b.id)).toEqual(["p", "z"]);
  });

  it("puts the personal workspace first, then the rest A to Z", () => {
    expect(orderWorkspaces([zebra, shop2, alpha, personal, shop1]).map((b) => b.id)).toEqual(["p", "a", "s1", "s2", "z"]);
  });

  it("doesn't reorder the list it was given", () => {
    const list = [zebra, personal];
    orderWorkspaces(list);
    expect(list.map((b) => b.id)).toEqual(["z", "p"]);
  });

  it("names the personal workspace after the account holder", () => {
    expect(workspaceName(personal, "Tanvir Ahmed")).toBe("Tanvir Ahmed");
    expect(workspaceName(alpha, "Tanvir Ahmed")).toBe("Alpha Store");
  });

  // Tanvir's shop opens by default and his Personal workspace doesn't.
  it("goes by the kind of workspace, not by which one opens by default", () => {
    const defaultShop = workspace("shop", { name: "Tanvir Ahmed's Shop", isDefault: true });
    const ownPersonal = workspace("own", { name: "Personal", type: "PERSONAL" });
    expect(workspaceName(defaultShop, "Tanvir Ahmed")).toBe("Tanvir Ahmed's Shop");
    expect(workspaceName(ownPersonal, "Tanvir Ahmed")).toBe("Tanvir Ahmed");
    expect(orderWorkspaces([defaultShop, zebra, ownPersonal]).map((b) => b.id)).toEqual(["own", "shop", "z"]);
  });
});

// What switchWorkspaceAction (and the stored choice) will open. The id is
// whatever the browser sent.
describe("switchTarget", () => {
  const personal = workspace("personal", { name: "Personal", type: "PERSONAL", isDefault: true });
  const shop = workspace("shop", { name: "Rahim Store" });
  const office = workspace("office", { name: "Office", role: "STAFF" });
  const mess = workspace("mess", { name: "Mess", type: "GROUP" });
  const mine = [mess, shop, personal, office];

  it("opens the account's own personal or business workspace", () => {
    expect(switchTarget(mine, "personal")).toBe(personal);
    expect(switchTarget(mine, "shop")).toBe(shop);
    // A member who isn't the owner can open it too.
    expect(switchTarget(mine, "office")).toBe(office);
  });

  it("never opens a group, though the account is in it", () => {
    expect(switchTarget(mine, "mess")).toBeUndefined();
  });

  it("refuses an id that isn't one of the account's", () => {
    expect(switchTarget(mine, "someone-elses-shop")).toBeUndefined();
    expect(switchTarget([personal, office], "shop")).toBeUndefined();
    expect(switchTarget([], "shop")).toBeUndefined();
  });

  it("matches the id exactly", () => {
    expect(switchTarget(mine, "SHOP")).toBeUndefined();
    expect(switchTarget(mine, " shop")).toBeUndefined();
    expect(switchTarget(mine, "sho")).toBeUndefined();
  });

  it("refuses anything that isn't one id", () => {
    for (const id of [undefined, null, "", 0, ["shop"], { id: "shop" }]) {
      expect(switchTarget(mine, id), JSON.stringify(id)).toBeUndefined();
    }
  });
});

describe("landingAfterSwitch", () => {
  it("stays on an ordinary page", () => {
    expect(landingAfterSwitch("/dashboard", "PERSONAL")).toBe("/dashboard");
    expect(landingAfterSwitch("/balance/overview", "BUSINESS")).toBe("/balance/overview");
    expect(landingAfterSwitch("/settings/workspaces", "PERSONAL")).toBe("/settings/workspaces");
  });

  it("sends a record's page to its list", () => {
    expect(landingAfterSwitch("/transactions/abc", "PERSONAL")).toBe("/transactions");
    expect(landingAfterSwitch("/transactions/abc?from=bell", "BUSINESS")).toBe("/transactions");
    expect(landingAfterSwitch("/contacts/abc", "BUSINESS")).toBe("/contacts");
    expect(landingAfterSwitch("/accounts/abc", "BUSINESS")).toBe("/accounts");
    expect(landingAfterSwitch("/habit-tracker/habits/namaz/abc", "PERSONAL")).toBe("/habit-tracker/habits?category=Namaz");
    expect(landingAfterSwitch("/habit-tracker/habits/ramadan/abc", "BUSINESS")).toBe("/habit-tracker/habits?category=Ramadan");
    expect(landingAfterSwitch("/habit-tracker/habits/others/abc", "PERSONAL")).toBe("/habit-tracker/habits?category=Others");
    expect(landingAfterSwitch("/group-expenses/abc?tab=meals", "PERSONAL")).toBe("/group-expenses");
  });

  it("sends a Books page home unless the new workspace is a business", () => {
    for (const route of ["/accounts", "/contacts", "/dena-pawna", "/transactions/advanced", "/accounts/abc", "/contacts/abc"]) {
      expect(landingAfterSwitch(route, "PERSONAL"), route).toBe("/dashboard");
    }
    expect(landingAfterSwitch("/dena-pawna", "BUSINESS")).toBe("/dena-pawna");
    expect(landingAfterSwitch("/transactions/advanced", "BUSINESS")).toBe("/transactions/advanced");
  });

  it("treats only whole path segments as Books", () => {
    expect(landingAfterSwitch("/accountsx", "PERSONAL")).toBe("/accountsx");
    expect(landingAfterSwitch("/transactions", "PERSONAL")).toBe("/transactions");
  });

  it("keeps the view and drops anything that names a record or a page", () => {
    expect(landingAfterSwitch("/habit-tracker/habits?category=Book", "PERSONAL")).toBe("/habit-tracker/habits?category=Book");
    expect(landingAfterSwitch("/reports/overview?range=last-month&accountId=x", "BUSINESS")).toBe("/reports/overview?range=last-month");
    expect(landingAfterSwitch("/balance/ledger?accountId=abc&page=3", "PERSONAL")).toBe("/balance/ledger");
    expect(landingAfterSwitch("/transactions?page=7&type=EXPENSE#top", "PERSONAL")).toBe("/transactions?type=EXPENSE");
  });

  it("goes home from anything that isn't a page of the app", () => {
    for (const from of [undefined, null, "", "/", "//evil.example/x", "https://evil.example/dashboard", "/\\evil.example", "/admin/users", "/login", "/api/auth/sign-out", "/choose-workspace?next=/x", "/unlock-workspace?id=1", "dashboard"]) {
      expect(landingAfterSwitch(from, "BUSINESS"), String(from)).toBe("/dashboard");
    }
  });

  it("knows every Books page the menu shows", () => {
    const books = NAV_SECTIONS.filter((section) => section.businessOnly).flatMap((section) => section.items.map((item) => item.href));
    expect(books.length).toBeGreaterThan(0);
    for (const href of books) {
      expect(isBusinessOnlyPath(href), href).toBe(true);
    }
    expect(BUSINESS_ONLY_ROUTES.every((route) => isBusinessOnlyPath(route))).toBe(true);
  });
});

describe("safeNextPath / chooseWorkspaceHref", () => {
  it("accepts a path in the app, query included", () => {
    expect(safeNextPath("/transactions/42?x=1")).toBe("/transactions/42?x=1");
    expect(safeNextPath("/group-expenses/abc")).toBe("/group-expenses/abc");
  });

  it("refuses other sites, other sides, the sign-in pages and the workspace pages", () => {
    for (const next of ["//evil.example", "https://evil.example", "/\t/evil.example", "/admin", "/login", "/", "/choose-workspace", "/choose-workspace?next=/dashboard", "/unlock-workspace?id=1", "/dashboard/../admin/users"]) {
      expect(safeNextPath(next), next).toBeNull();
    }
  });

  it("refuses anything that isn't one string", () => {
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(["/dashboard", "/admin"])).toBeNull();
    expect(safeNextPath(42)).toBeNull();
  });

  it("carries the page to come back to, and nothing for home", () => {
    const href = chooseWorkspaceHref("/reports/overview?range=last-month");
    expect(href).toBe("/choose-workspace?next=%2Freports%2Foverview%3Frange%3Dlast-month");
    expect(safeNextPath(new URL(href, "http://x.invalid").searchParams.get("next"))).toBe("/reports/overview?range=last-month");
    expect(chooseWorkspaceHref("/dashboard")).toBe("/choose-workspace");
    expect(chooseWorkspaceHref(undefined)).toBe("/choose-workspace");
    expect(chooseWorkspaceHref("//evil.example")).toBe("/choose-workspace");
    expect(chooseWorkspaceHref("/choose-workspace?next=/x")).toBe("/choose-workspace");
  });
});

describe("needsWorkspaceChoice", () => {
  it("asks only when there is a real choice and none is remembered", () => {
    expect(needsWorkspaceChoice({ remembered: false, choices: 2, viewAs: false })).toBe(true);
    expect(needsWorkspaceChoice({ remembered: true, choices: 2, viewAs: false })).toBe(false);
    expect(needsWorkspaceChoice({ remembered: false, choices: 1, viewAs: false })).toBe(false);
    expect(needsWorkspaceChoice({ remembered: false, choices: 0, viewAs: false })).toBe(false);
  });

  it("never asks an admin viewing a customer", () => {
    expect(needsWorkspaceChoice({ remembered: false, choices: 3, viewAs: true })).toBe(false);
  });
});
