import { describe, expect, it } from "vitest";
import { bnDictionary } from "@/lib/i18n/dictionary";
import { translate } from "@/lib/i18n/translate";
import {
  breadcrumbFor,
  findNavLocation,
  movesMoney,
  NAV_FOOT,
  NAV_FOOT_LABEL,
  NAV_SECTIONS,
  queryOf,
  titleFor,
  titleParts,
  visibleNavSections,
  type NavContext,
  type NavLocation,
} from "./nav";

const personal: NavContext = { workspaceType: "PERSONAL", isFeatureOn: () => true };
const business: NavContext = { workspaceType: "BUSINESS", isFeatureOn: () => true };

const query = (params: Record<string, string> = {}) => ({ get: (name: string) => params[name] ?? null });

const locate = (pathname: string, ctx = personal, params?: Record<string, string>) =>
  findNavLocation(pathname, query(params), visibleNavSections(ctx), NAV_FOOT);

// Every page the menu names, Books and the foot included.
const everyLocation: NavLocation[] = [
  ...NAV_SECTIONS.flatMap((section) => section.items.map((item) => ({ section, item }))),
  ...NAV_FOOT.map((item) => ({ section: null, item })),
].flatMap(({ section, item }) => [{ section, item, sub: null }, ...(item.subs ?? []).map((sub) => ({ section, item, sub }))]);

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

  it("puts the account's pages under Account", () => {
    expect(breadcrumbFor(locate("/referrals")!)).toEqual({ crumbs: [NAV_FOOT_LABEL], heading: "Invite & earn", tone: "money" });
    expect(breadcrumbFor(locate("/settings/security")!)).toEqual({ crumbs: [NAV_FOOT_LABEL, "Settings"], heading: "Security", tone: "money" });
  });

  it("names the sub-page that shares its group's link", () => {
    expect(breadcrumbFor(locate("/balance/overview")!)).toEqual({ crumbs: ["Money", "Wallets"], heading: "Balance", tone: "money" });
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
    expect(breadcrumbFor(locate("/settings/workspaces")!)).toEqual({ crumbs: [NAV_FOOT_LABEL, "Settings"], heading: "Workspaces", tone: "money" });
    expect(locate("/referrals")!.item.tag).toBe("Earn ৳");
  });

  it("returns null for a page outside the menu", () => {
    expect(locate("/unknown-page")).toBeNull();
  });
});

describe("renamed labels", () => {
  it("calls the password vault's section Vault, leaving Security to Settings", () => {
    expect(NAV_SECTIONS.map((section) => section.label)).toContain("Vault");
    expect(NAV_SECTIONS.map((section) => section.label)).not.toContain("Security");
    expect(breadcrumbFor(locate("/password-manager")!)).toEqual({ crumbs: ["Vault"], heading: "Password vault", tone: "vault" });
  });

  it("calls the asset categories page Asset types, on the same route", () => {
    const location = locate("/assets-management/category")!;
    expect(location.item.label).toBe("Assets");
    expect(location.sub?.label).toBe("Asset types");
    expect(location.item.subs?.map((sub) => sub.label)).not.toContain("Categories");
  });

  it("reads Account as the customer's own in both languages", () => {
    expect(translate("en", NAV_FOOT_LABEL)).toBe("Account");
    expect(translate("bn", NAV_FOOT_LABEL)).toBe("অ্যাকাউন্ট");
  });
});

describe("queryOf", () => {
  it("reads searchParams the way URLSearchParams.get does", () => {
    const params = queryOf({ category: "Namaz", tag: ["a", "b"], gone: undefined });
    expect(params.get("category")).toBe("Namaz");
    expect(params.get("tag")).toBe("a");
    expect(params.get("gone")).toBeNull();
    expect(params.get("missing")).toBeNull();
    expect(params.get("constructor")).toBeNull();
    expect(queryOf().get("category")).toBeNull();
  });

  it("finds the habit page a query names", () => {
    expect(findNavLocation("/habit-tracker/habits", queryOf({ category: "Ramadan" }), NAV_SECTIONS)!.item.label).toBe("Ramadan");
  });
});

describe("titleParts", () => {
  it("names a sub-page with its group and a page on its own", () => {
    expect(titleParts(locate("/balance/transfer")!)).toEqual(["Transfer", "Wallets"]);
    expect(titleParts(locate("/transactions")!)).toEqual(["Transactions"]);
    expect(titleParts(locate("/dashboard")!)).toEqual(["Home"]);
    expect(titleParts(locate("/settings/security")!)).toEqual(["Security", "Settings"]);
    expect(titleParts(locate("/referrals")!)).toEqual(["Invite & earn"]);
  });

  it("puts a record's name first", () => {
    expect(titleParts(locate("/transactions/abc123")!, "Grocery run")).toEqual(["Grocery run", "Transactions"]);
    expect(titleParts(locate("/loan-management/bank-person-list")!, "  Rahim ")).toEqual(["Rahim", "People & banks", "Loans"]);
    expect(titleParts(locate("/transactions/abc123")!, "   ")).toEqual(["Transactions"]);
    expect(titleParts(locate("/transactions/abc123")!, null)).toEqual(["Transactions"]);
  });

  it("always gives a shared label its group", () => {
    expect(titleParts(locate("/balance/ledger")!)).toEqual(["Statement", "Wallets"]);
    expect(titleParts(locate("/loan-management/ledger")!)).toEqual(["Statement", "Loans"]);
    expect(titleParts(locate("/loan-management/dashboard")!)).toEqual(["Overview", "Loans"]);
    expect(titleParts(locate("/assets-management/dashboard")!)).toEqual(["Overview", "Assets"]);
    expect(titleParts(locate("/reports/overview")!)).toEqual(["Overview", "Insights"]);
  });

  it("gives every page the menu names a title of its own", () => {
    const titles = everyLocation.map((location) => titleParts(location).join(" · "));
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("titleFor", () => {
  it("translates the menu's words but not the record's name", () => {
    const t = (key: string) => `<${key}>`;
    expect(titleFor(locate("/balance/transfer")!, t)).toBe("<Transfer> · <Wallets>");
    expect(titleFor(locate("/transactions/abc123")!, t, "Rahim")).toBe("Rahim · <Transactions>");
  });

  it("reads in Bangla", () => {
    const bn = (key: string) => translate("bn", key);
    expect(titleFor(locate("/settings/security")!, bn)).toBe("নিরাপত্তা · সেটিংস");
    expect(titleFor(locate("/loan-management/ledger")!, bn)).toBe("স্টেটমেন্ট · দেনা-পাওনা");
    expect(titleFor(locate("/assets-management/category")!, bn)).toBe("সম্পদের ধরন · সম্পদ");
  });
});

describe("Bangla for the menu", () => {
  it("has an entry for every section, page, group, tag and the chevron", () => {
    const words = new Set<string>([NAV_FOOT_LABEL, "{group} pages", "Main"]);
    for (const section of NAV_SECTIONS) if (section.label) words.add(section.label);
    for (const location of everyLocation) {
      words.add(location.item.label);
      if (location.item.tag) words.add(location.item.tag);
      if (location.sub) words.add(location.sub.label);
    }
    const missing = [...words].filter((word) => !Object.hasOwn(bnDictionary, word) || !bnDictionary[word]);
    expect(missing).toEqual([]);
  });
});

describe("movesMoney", () => {
  it("floats the + on Home, the money pages and Books", () => {
    expect(movesMoney(locate("/dashboard"))).toBe(true);
    expect(movesMoney(locate("/transactions/abc"))).toBe(true);
    expect(movesMoney(locate("/loan-management/dashboard"))).toBe(true);
    expect(movesMoney(locate("/accounts", business))).toBe(true);
  });

  it("leaves it off habits, insights, the vault and the account pages", () => {
    expect(movesMoney(locate("/habit-tracker"))).toBe(false);
    expect(movesMoney(locate("/reports/overview"))).toBe(false);
    expect(movesMoney(locate("/password-manager"))).toBe(false);
    expect(movesMoney(locate("/settings"))).toBe(false);
    expect(movesMoney(locate("/referrals"))).toBe(false);
  });

  it("keeps it on a page the menu doesn't know", () => {
    expect(movesMoney(locate("/somewhere-new"))).toBe(true);
  });
});
