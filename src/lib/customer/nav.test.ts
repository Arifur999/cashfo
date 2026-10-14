import { describe, expect, it } from "vitest";
import { breadcrumbFor, findNavLocation, NAV_FOOT, visibleNavSections, type NavContext } from "./nav";

const personal: NavContext = { workspaceType: "PERSONAL", isFeatureOn: () => true };
const business: NavContext = { workspaceType: "BUSINESS", isFeatureOn: () => true };

const query = (params: Record<string, string> = {}) => ({ get: (name: string) => params[name] ?? null });

const locate = (pathname: string, ctx = personal, params?: Record<string, string>) =>
  findNavLocation(pathname, query(params), visibleNavSections(ctx), NAV_FOOT);

describe("visibleNavSections", () => {
  it("shows Books only in a business workspace", () => {
    expect(visibleNavSections(personal).some((s) => s.label === "Books")).toBe(false);
    expect(visibleNavSections(business).some((s) => s.label === "Books")).toBe(true);
    expect(visibleNavSections({ workspaceType: "GROUP", isFeatureOn: () => true }).some((s) => s.label === "Books")).toBe(false);
  });

  it("hides Loans while its feature flag is off", () => {
    const sections = visibleNavSections({ workspaceType: "PERSONAL", isFeatureOn: (key) => key !== "loan_management" });
    const money = sections.find((s) => s.label === "Money");
    expect(money?.items.map((i) => i.label)).not.toContain("Loans");
  });
});

describe("findNavLocation", () => {
  it("finds a plain page and its detail route", () => {
    expect(breadcrumbFor(locate("/transactions")!)).toEqual({ crumbs: ["Money"], heading: "Transactions", tone: "money" });
    expect(breadcrumbFor(locate("/transactions/abc123")!).heading).toBe("Transactions");
  });

  it("finds a page inside a group", () => {
    const location = locate("/balance/transfer")!;
    expect(location.item.label).toBe("Wallets");
    expect(location.sub?.label).toBe("Transfer");
    expect(breadcrumbFor(location)).toEqual({ crumbs: ["Money", "Wallets"], heading: "Transfer", tone: "money" });
  });

  it("prefers the most specific entry", () => {
    expect(locate("/transactions/advanced", personal)!.item.label).toBe("Transactions");
    expect(locate("/transactions/advanced", business)!.item.label).toBe("Journal entry");
  });

  it("tells the habit pages apart by their category", () => {
    expect(locate("/habit-tracker/habits", personal, { category: "Namaz" })!.item.label).toBe("Namaz");
    expect(locate("/habit-tracker/habits", personal, { category: "Book" })!.item.label).toBe("My library");
    expect(locate("/habit-tracker/habits/ramadan/sheet-1")!.item.label).toBe("Ramadan");
    expect(locate("/habit-tracker")!.item.label).toBe("Today");
    expect(locate("/habit-tracker/todos/list-9")!.item.label).toBe("To-do list");
  });

  it("colours Loans with its own pillar and Home with none", () => {
    expect(breadcrumbFor(locate("/loan-management/ledger")!)).toEqual({ crumbs: ["Money", "Loans"], heading: "Statement", tone: "loans" });
    expect(breadcrumbFor(locate("/dashboard")!)).toEqual({ crumbs: [], heading: "Home", tone: "money" });
  });

  it("finds the foot links", () => {
    expect(breadcrumbFor(locate("/settings/workspaces")!)).toEqual({ crumbs: [], heading: "Settings", tone: "money" });
    expect(locate("/referrals")!.item.tag).toBe("Earn ৳");
  });

  it("returns null for a page outside the menu", () => {
    expect(locate("/unknown-page")).toBeNull();
  });
});
