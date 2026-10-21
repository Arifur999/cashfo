import { describe, expect, it } from "vitest";
import { findNavLocation, visibleNavSections } from "@/lib/customer/nav";
import { listOf, listUrlKey, listVisitUrl, restoredListUrl, savedListUrl, savedListValue, topbarTrail } from "./topbarCrumbs";

const sections = visibleNavSections({ workspaceType: "BUSINESS", isFeatureOn: () => true });
const at = (url: string) => {
  const parsed = new URL(url, "http://app.test");
  return { location: findNavLocation(parsed.pathname, parsed.searchParams, sections), pathname: parsed.pathname, query: parsed.searchParams };
};
const locate = (url: string) => {
  const { location } = at(url);
  if (!location) throw new Error(`no menu entry for ${url}`);
  return location;
};

describe("topbarTrail", () => {
  it("keeps a section as plain text", () => {
    expect(topbarTrail(locate("/transactions"), false)).toEqual([{ label: "Money" }]);
  });

  it("links a group to its first page", () => {
    expect(topbarTrail(locate("/balance/ledger"), false)).toEqual([{ label: "Money" }, { label: "Wallets", href: "/balance/overview" }]);
    expect(topbarTrail(locate("/loan-management/ledger"), false)).toEqual([{ label: "Money" }, { label: "Loans", href: "/loan-management/dashboard" }]);
  });

  it("links Settings from its sections, under the plain Account heading", () => {
    const trail = topbarTrail(locate("/settings/security"), false);
    expect(trail[trail.length - 1]).toEqual({ label: "Settings", href: "/settings" });
    expect(trail[0].href).toBeUndefined();
  });

  it("adds the list a record page came from, at the address it was left", () => {
    expect(topbarTrail(locate("/transactions/abc"), true, "/transactions?page=3")).toEqual([{ label: "Money" }, { label: "Transactions", href: "/transactions?page=3" }]);
    expect(topbarTrail(locate("/contacts/c1"), true)).toEqual([{ label: "Books" }, { label: "Customers & suppliers", href: "/contacts" }]);
  });

  it("opens a habit list with its own category", () => {
    expect(topbarTrail(locate("/habit-tracker/habits/namaz/2026-10"), true)).toEqual([{ label: "Habits" }, { label: "Namaz", href: "/habit-tracker/habits?category=Namaz" }]);
  });

  it("leaves the list as text for a record shown on the list's own page", () => {
    // The vault opens its security checkup on /password-manager itself, so
    // the bar sees the list's own address and passes linkList: false.
    const vault = at("/password-manager");
    expect(listVisitUrl(vault.location, vault.pathname, vault.query)).toBe("/password-manager");
    expect(topbarTrail(vault.location!, true, undefined, { linkList: false })).toEqual([{ label: "Vault" }, { label: "Password vault" }]);
  });
});

describe("savedListUrl", () => {
  const transactions = listOf(locate("/transactions"));
  const savedInA = savedListValue("business-a", "/transactions?accountId=wallet-a&page=4");

  it("reads back the address this workspace saved", () => {
    expect(savedListUrl(savedInA, "business-a")).toBe("/transactions?accountId=wallet-a&page=4");
  });

  it("ignores an address saved in another workspace", () => {
    expect(savedListUrl(savedInA, "business-b")).toBeNull();
    // The crumb then opens the plain list, not A's wallet and page.
    expect(restoredListUrl(transactions, savedListUrl(savedInA, "business-b"))).toBe("/transactions");
    expect(savedListUrl(savedInA, null)).toBeNull();
  });

  it("ignores older plain values and anything unreadable", () => {
    expect(savedListUrl(null, "business-a")).toBeNull();
    expect(savedListUrl("/transactions?page=3", "business-a")).toBeNull();
    expect(savedListUrl('"/transactions?page=3"', "business-a")).toBeNull();
    expect(savedListUrl("null", "business-a")).toBeNull();
    expect(savedListUrl("{", "business-a")).toBeNull();
    expect(savedListUrl(JSON.stringify({ businessId: "business-a", url: 4 }), "business-a")).toBeNull();
    expect(savedListUrl(JSON.stringify({ url: "/transactions?page=3" }), "business-a")).toBeNull();
  });
});

describe("listVisitUrl", () => {
  it("saves a list's own page with its filters", () => {
    const visit = at("/transactions?type=EXPENSE&page=2");
    expect(listVisitUrl(visit.location, visit.pathname, visit.query)).toBe("/transactions?type=EXPENSE&page=2");
    const plain = at("/contacts");
    expect(listVisitUrl(plain.location, plain.pathname, plain.query)).toBe("/contacts");
  });

  it("never saves a record page as its list", () => {
    const record = at("/transactions/abc");
    expect(listVisitUrl(record.location, record.pathname, record.query)).toBeNull();
    const sheet = at("/habit-tracker/habits/namaz/2026-10");
    expect(listVisitUrl(sheet.location, sheet.pathname, sheet.query)).toBeNull();
  });

  it("saves a habit list only under its own category", () => {
    const namaz = at("/habit-tracker/habits?category=Namaz&year=2026");
    expect(listVisitUrl(namaz.location, namaz.pathname, namaz.query)).toBe("/habit-tracker/habits?category=Namaz&year=2026");
    expect(listUrlKey(listOf(namaz.location!))).toBe("lastListUrl:/habit-tracker/habits?category=Namaz");
  });

  it("saves nothing off the menu", () => {
    expect(listVisitUrl(null, "/somewhere", new URLSearchParams())).toBeNull();
  });
});

describe("restoredListUrl", () => {
  const transactions = listOf(locate("/transactions"));
  const namaz = listOf(locate("/habit-tracker/habits?category=Namaz"));

  it("reopens the list as it was left", () => {
    expect(restoredListUrl(transactions, "/transactions?page=3&type=INCOME")).toBe("/transactions?page=3&type=INCOME");
    expect(restoredListUrl(namaz, "/habit-tracker/habits?category=Namaz&year=2025")).toBe("/habit-tracker/habits?category=Namaz&year=2025");
  });

  it("falls back to the plain list for anything that isn't this list", () => {
    expect(restoredListUrl(transactions, null)).toBe("/transactions");
    expect(restoredListUrl(transactions, "/contacts?page=2")).toBe("/transactions");
    expect(restoredListUrl(transactions, "//evil.example/transactions")).toBe("/transactions");
    expect(restoredListUrl(transactions, "/\\evil.example/transactions")).toBe("/transactions");
    expect(restoredListUrl(transactions, "https://evil.example/transactions")).toBe("/transactions");
    expect(restoredListUrl(transactions, "javascript:alert(1)")).toBe("/transactions");
    expect(restoredListUrl(namaz, "/habit-tracker/habits?category=Ramadan")).toBe("/habit-tracker/habits?category=Namaz");
  });
});
