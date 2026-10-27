import { describe, expect, it } from "vitest";
import { bnDictionary } from "@/lib/i18n/dictionary";
import { translate } from "@/lib/i18n/translate";
import {
  breadcrumbFor,
  findNavLocation,
  HABIT_APP_LABEL,
  menuSections,
  movesMoney,
  NAV_FOOT,
  NAV_FOOT_LABEL,
  NAV_SECTIONS,
  navAppFor,
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

// Every page the menus name, the hidden sections and the foot included.
const everyLocation: NavLocation[] = [
  ...NAV_SECTIONS.flatMap((section) => section.items.map((item) => ({ section, item }))),
  ...NAV_FOOT.map((item) => ({ section: null, item })),
].flatMap(({ section, item }) => [{ section, item, sub: null }, ...(item.subs ?? []).map((sub) => ({ section, item, sub }))]);

const labels = (ctx: NavContext, app: "money" | "habit") =>
  menuSections(visibleNavSections(ctx), app).map((section) => [section.label, section.items.map((item) => [item.label, ...(item.subs ?? []).map((sub) => sub.label)])]);

describe("the two menus", () => {
  it("draws the Money Tracker as the AppSidebar board does", () => {
    expect(labels(business, "money")).toEqual([
      ["Overview", [["Dashboard"], ["Reports"]]],
      [
        "Money",
        [
          ["Income & Expense", "Transactions", "Budget Planning", "Income Category"],
          ["Balance", "Overview", "Balance Transfer", "Ledger", "Wallet"],
        ],
      ],
      [
        "Plan & track",
        [
          ["Savings Goals", "Dashboard", "Overview", "Wallet", "Transfer"],
          ["Assets Management", "Dashboard", "Current Asset list", "Purchase & Sell Asset", "Asset update", "Category"],
          ["Loan Management", "Dashboard", "Transactions", "Ledger", "Contacts"],
          ["Group Expense"],
        ],
      ],
      [NAV_FOOT_LABEL, [["Referrals"], ["Password Manager"]]],
    ]);
  });

  it("draws the Habit Tracker as the HabitSidebar board does", () => {
    expect(labels(personal, "habit")).toEqual([
      ["Overview", [["Dashboard"]]],
      ["Worship", [["Namaz"], ["Ramadan"]]],
      ["Habits", [["Daily habits"], ["Challenges"], ["My Library"], ["Skills"]]],
      ["Plan@@habits", [["To Do List"]]],
    ]);
  });

  it("keeps the pages the boards leave out of the menu, under hidden sections", () => {
    const hidden = visibleNavSections(business).filter((section) => section.hidden);
    expect(hidden.map((section) => section.label)).toEqual(["Books", "Insights"]);
    expect(locate("/reports/overview")!.section?.label).toBe("Insights");
    expect(locate("/contacts", business)!.item.label).toBe("Customers & suppliers");
  });

  it("files every page under /habit-tracker in the Habit Tracker", () => {
    expect(navAppFor("/habit-tracker")).toBe("habit");
    expect(navAppFor("/habit-tracker/habits/namaz/x")).toBe("habit");
    expect(navAppFor("/habit-trackers")).toBe("money");
    expect(navAppFor("/dashboard")).toBe("money");
    expect(navAppFor("/settings")).toBe("money");
  });
});

describe("visibleNavSections", () => {
  it("has Books only in a business workspace", () => {
    expect(visibleNavSections(personal).some((s) => s.label === "Books")).toBe(false);
    expect(visibleNavSections(business).some((s) => s.label === "Books")).toBe(true);
    expect(visibleNavSections({ workspaceType: "GROUP", isFeatureOn: () => true }).some((s) => s.label === "Books")).toBe(false);
  });

  it("hides Loan Management while its feature flag is off", () => {
    const sections = visibleNavSections({ workspaceType: "PERSONAL", isFeatureOn: (key) => key !== "loan_management" });
    const plan = sections.find((s) => s.label === "Plan & track");
    expect(plan?.items.map((i) => i.label)).not.toContain("Loan Management");
  });

  // The API refuses a staff member's journal entries; the rest of Books
  // they may read.
  it("hides Journal entry from a staff member", () => {
    const books = (ctx: NavContext) => visibleNavSections(ctx).find((s) => s.label === "Books")?.items.map((i) => i.label);
    expect(books(business)).toContain("Journal entry");
    expect(books({ ...business, canManage: true })).toContain("Journal entry");
    expect(books({ ...business, canManage: false })).toEqual(["Customers & suppliers", "Receivables & payables", "Accounts"]);
    expect(locate("/transactions/advanced", { ...business, canManage: false })!.sub?.label).toBe("Transactions");
  });
});

describe("findNavLocation", () => {
  it("finds a page inside a group and its detail route", () => {
    expect(breadcrumbFor(locate("/transactions")!)).toEqual({ crumbs: ["Income & Expense"], heading: "Transactions", tone: "money" });
    expect(breadcrumbFor(locate("/transactions/abc123")!).heading).toBe("Transactions");
    const location = locate("/balance/wallet")!;
    expect(location.item.label).toBe("Balance");
    expect(location.sub?.label).toBe("Wallet");
    expect(breadcrumbFor(location)).toEqual({ crumbs: ["Balance"], heading: "Wallet", tone: "money" });
  });

  it("names a page of its own under its section, and the first section's alone", () => {
    expect(breadcrumbFor(locate("/group-expenses")!)).toEqual({ crumbs: ["Plan & track"], heading: "Group Expense", tone: "money" });
    expect(breadcrumbFor(locate("/referrals")!)).toEqual({ crumbs: [NAV_FOOT_LABEL], heading: "Referrals", tone: "neutral" });
    expect(breadcrumbFor(locate("/dashboard")!)).toEqual({ crumbs: [], heading: "Dashboard", tone: "money" });
    expect(breadcrumbFor(locate("/reports/detailed")!)).toEqual({ crumbs: [], heading: "Reports", tone: "insights" });
    expect(breadcrumbFor(locate("/habit-tracker")!)).toEqual({ crumbs: [], heading: "Dashboard", tone: "habits" });
    expect(breadcrumbFor(locate("/habit-tracker/daily")!)).toEqual({ crumbs: ["Habits"], heading: "Daily habits", tone: "habits" });
  });

  it("puts Settings' sections under Settings", () => {
    expect(breadcrumbFor(locate("/settings/security")!)).toEqual({ crumbs: ["Settings"], heading: "Security", tone: "money" });
    expect(breadcrumbFor(locate("/settings")!)).toEqual({ crumbs: [], heading: "Settings", tone: "money" });
  });

  it("names the sub-page that shares its group's link", () => {
    expect(breadcrumbFor(locate("/balance/overview")!)).toEqual({ crumbs: ["Balance"], heading: "Overview", tone: "money" });
  });

  it("prefers the most specific entry", () => {
    expect(locate("/transactions/advanced", personal)!.sub?.label).toBe("Transactions");
    expect(locate("/transactions/advanced", business)!.item.label).toBe("Journal entry");
  });

  it("tells the habit pages apart by their category", () => {
    expect(locate("/habit-tracker/habits", personal, { category: "Namaz" })!.item.label).toBe("Namaz");
    expect(locate("/habit-tracker/habits", personal, { category: "Book" })!.item.label).toBe("My Library");
    expect(locate("/habit-tracker/habits", personal, { category: "Others" })!.item.label).toBe("Challenges");
    expect(locate("/habit-tracker/habits", personal, { category: "Course" })!.item.label).toBe("Skills");
    expect(locate("/habit-tracker/habits/ramadan/sheet-1")!.item.label).toBe("Ramadan");
    expect(locate("/habit-tracker/habits/others/sheet-2")!.item.label).toBe("Challenges");
    expect(locate("/habit-tracker")!.item.label).toBe("Dashboard");
    expect(locate("/habit-tracker/todos/list-9")!.item.label).toBe("To Do List");
  });

  it("colours Loan Management with its own pillar", () => {
    expect(breadcrumbFor(locate("/loan-management/ledger")!)).toEqual({ crumbs: ["Loan Management"], heading: "Ledger", tone: "loans" });
  });

  it("returns null for a page outside the menu", () => {
    expect(locate("/unknown-page")).toBeNull();
  });

  // Each retired page forwards to the one that took its place.
  it("files the retired planning pages where they now forward", () => {
    expect(locate("/income-planning")!.sub?.label).toBe("Income Category");
    expect(locate("/budget-planning")!.sub?.label).toBe("Budget Planning");
  });
});

describe("Account", () => {
  it("reads Account as the customer's own in both languages", () => {
    expect(translate("en", NAV_FOOT_LABEL)).toBe("Account");
    expect(translate("bn", NAV_FOOT_LABEL)).toBe("অ্যাকাউন্ট");
  });

  it("reads the Habit Tracker's Plan as a plan of work, not a subscription", () => {
    expect(translate("en", "Plan@@habits")).toBe("Plan");
    expect(translate("bn", "Plan@@habits")).toBe("পরিকল্পনা");
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
  it("names a group's page with its group and a page on its own", () => {
    expect(titleParts(locate("/balance/transfer")!)).toEqual(["Balance Transfer", "Balance"]);
    expect(titleParts(locate("/transactions")!)).toEqual(["Transactions", "Income & Expense"]);
    expect(titleParts(locate("/dashboard")!)).toEqual(["Dashboard"]);
    expect(titleParts(locate("/settings/security")!)).toEqual(["Security", "Settings"]);
    expect(titleParts(locate("/referrals")!)).toEqual(["Referrals"]);
  });

  it("puts a record's name first", () => {
    expect(titleParts(locate("/transactions/abc123")!, "Grocery run")).toEqual(["Grocery run", "Transactions", "Income & Expense"]);
    expect(titleParts(locate("/loan-management/bank-person-list")!, "  Rahim ")).toEqual(["Rahim", "Contacts", "Loan Management"]);
    expect(titleParts(locate("/group-expenses/b1")!, "Flat 4B")).toEqual(["Flat 4B", "Group Expense"]);
    expect(titleParts(locate("/transactions/abc123")!, "   ")).toEqual(["Transactions", "Income & Expense"]);
    expect(titleParts(locate("/transactions/abc123")!, null)).toEqual(["Transactions", "Income & Expense"]);
  });

  it("tells shared labels apart", () => {
    expect(titleParts(locate("/balance/ledger")!)).toEqual(["Ledger", "Balance"]);
    expect(titleParts(locate("/loan-management/ledger")!)).toEqual(["Ledger", "Loan Management"]);
    expect(titleParts(locate("/savings-goals/dashboard")!)).toEqual(["Dashboard", "Savings Goals"]);
    expect(titleParts(locate("/habit-tracker")!)).toEqual(["Dashboard", HABIT_APP_LABEL]);
    expect(titleParts(locate("/reports/overview")!)).toEqual(["Overview", "Insights"]);
  });

  it("gives every page the menus name a title of its own", () => {
    const titles = everyLocation.map((location) => titleParts(location).join(" · "));
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("titleFor", () => {
  it("translates the menu's words but not the record's name", () => {
    const t = (key: string) => `<${key}>`;
    expect(titleFor(locate("/balance/transfer")!, t)).toBe("<Balance Transfer> · <Balance>");
    expect(titleFor(locate("/group-expenses/b1")!, t, "Rahim")).toBe("Rahim · <Group Expense>");
  });

  it("reads in Bangla", () => {
    const bn = (key: string) => translate("bn", key);
    expect(titleFor(locate("/settings/security")!, bn)).toBe("নিরাপত্তা · সেটিংস");
    expect(titleFor(locate("/loan-management/ledger")!, bn)).toBe("লেজার · ঋণ ব্যবস্থাপনা");
    expect(titleFor(locate("/assets-management/category")!, bn)).toBe("ক্যাটাগরি · সম্পদ ব্যবস্থাপনা");
  });
});

describe("Bangla for the menus", () => {
  it("has an entry for every section, page, group, tag and the chevron", () => {
    const words = new Set<string>([NAV_FOOT_LABEL, HABIT_APP_LABEL, "{group} pages", "Main"]);
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
  it("floats the + on the dashboard, the money pages and Books", () => {
    expect(movesMoney(locate("/dashboard"))).toBe(true);
    expect(movesMoney(locate("/transactions/abc"))).toBe(true);
    expect(movesMoney(locate("/loan-management/dashboard"))).toBe(true);
    expect(movesMoney(locate("/group-expenses"))).toBe(true);
    expect(movesMoney(locate("/accounts", business))).toBe(true);
  });

  it("leaves it off the Habit Tracker, reports, the account's pages and Settings", () => {
    expect(movesMoney(locate("/habit-tracker"))).toBe(false);
    expect(movesMoney(locate("/habit-tracker/daily"))).toBe(false);
    expect(movesMoney(locate("/reports/detailed"))).toBe(false);
    expect(movesMoney(locate("/reports/overview"))).toBe(false);
    expect(movesMoney(locate("/password-manager"))).toBe(false);
    expect(movesMoney(locate("/settings"))).toBe(false);
    expect(movesMoney(locate("/referrals"))).toBe(false);
  });

  it("keeps it on a page the menu doesn't know", () => {
    expect(movesMoney(locate("/somewhere-new"))).toBe(true);
  });
});
