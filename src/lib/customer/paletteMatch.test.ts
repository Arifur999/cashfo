import { describe, expect, it } from "vitest";
import type { NavItem, NavSection } from "./nav";
import { leafHref, matchRank, matchScore, palettePages, rankMatches } from "./paletteMatch";

describe("matchRank", () => {
  it("ranks a prefix over a word's start over the inside of a word", () => {
    expect(matchRank("wal", "Wallets")).toBe(3);
    expect(matchRank("wal", "Savings wallets")).toBe(2);
    expect(matchRank("let", "Wallets")).toBe(1);
    expect(matchRank("xyz", "Wallets")).toBe(0);
  });

  it("ignores case, extra spaces and an empty query", () => {
    expect(matchRank("  MY   wal ", "My wallets")).toBe(3);
    expect(matchRank("", "Wallets")).toBe(0);
    expect(matchRank("   ", "Wallets")).toBe(0);
  });

  it("treats punctuation as the edge of a word", () => {
    expect(matchRank("do", "To-do list")).toBe(2);
    expect(matchRank("banks", "People & banks")).toBe(2);
    expect(matchRank("পাওনা", "দেনা-পাওনা")).toBe(2);
  });

  it("finds a word's start even after an earlier match inside a word", () => {
    // "on" sits inside "money" before it starts "only".
    expect(matchRank("on", "money only")).toBe(2);
  });

  it("matches Bangla whichever way a letter was typed", () => {
    // য় as one code point (U+09DF) and as য + nukta.
    expect(matchRank("য়", "য়")).toBe(3);
    expect(matchRank("সঞ্চ", "সঞ্চয়")).toBe(3);
  });
});

describe("matchScore", () => {
  it("puts any match on the name above a match on the context", () => {
    const inside = matchScore("let", { titles: ["Wallets"] });
    const contextPrefix = matchScore("wal", { titles: ["Statement"], context: ["Wallets"] });
    expect(inside).toBeGreaterThan(contextPrefix);
    expect(contextPrefix).toBeGreaterThan(0);
  });

  it("finds an entry by its translated name", () => {
    expect(matchScore("ওয়ালেট", { titles: ["Wallets", "ওয়ালেট"] })).toBe(6);
  });

  it("doesn't count the inside of a context word", () => {
    expect(matchScore("one", { titles: ["Statement"], context: ["Money"] })).toBe(0);
  });

  it("lets a single letter match only the start of a word", () => {
    expect(matchScore("s", { titles: ["Savings"] })).toBe(6);
    expect(matchScore("s", { titles: ["My assets"] })).toBe(0);
    expect(matchScore("a", { titles: ["My assets"] })).toBe(5);
  });

  it("finds several words across the name and its context", () => {
    expect(matchScore("loan statement", { titles: ["Statement"], context: ["Money", "Loans"] })).toBe(1);
    expect(matchScore("loan statement", { titles: ["Statement"], context: ["Money", "Wallets"] })).toBe(0);
  });
});

describe("rankMatches", () => {
  const titles = (label: string) => ({ titles: [label] });

  it("orders prefix, then word start, then inside a word", () => {
    expect(rankMatches("wal", ["Savings wallets", "Rewalled", "Wallets"], titles)).toEqual(["Wallets", "Savings wallets", "Rewalled"]);
  });

  it("keeps the given order between equal matches and drops the rest", () => {
    expect(rankMatches("s", ["Summary", "Budget", "Savings", "Skills"], titles)).toEqual(["Summary", "Savings", "Skills"]);
  });

  it("stops at the limit and finds nothing for an empty query", () => {
    expect(rankMatches("s", ["Summary", "Savings", "Skills"], titles, 2)).toEqual(["Summary", "Savings"]);
    expect(rankMatches("", ["Summary"], titles)).toEqual([]);
  });
});

describe("palettePages", () => {
  const sections: NavSection[] = [
    { tone: "money", items: [{ label: "Home", href: "/dashboard", icon: "home" }] },
    {
      label: "Money",
      tone: "money",
      items: [
        {
          label: "Wallets",
          href: "/balance/overview",
          icon: "wallet",
          subs: [
            { label: "Balance", href: "/balance/overview" },
            { label: "Statement", href: "/balance/ledger" },
          ],
        },
        { label: "Loans", href: "/loan-management/dashboard", icon: "loans", tone: "loans", subs: [{ label: "Statement", href: "/loan-management/ledger" }] },
      ],
    },
    { label: "Habits", tone: "habits", items: [{ label: "Namaz", href: "/habit-tracker/habits", query: { category: "Namaz" }, icon: "namaz" }] },
  ];
  const foot: NavItem[] = [
    { label: "Invite & earn", href: "/referrals", icon: "gift" },
    { label: "Settings", href: "/settings", icon: "settings", subs: [{ label: "Profile", href: "/settings/profile" }] },
  ];
  const settings = [
    { href: "/settings", label: "Profile" },
    { href: "/settings/security", label: "Security" },
  ];
  const pages = palettePages(sections, foot, "Account@@user", settings);
  const find = (label: string, trail: string[]) => pages.find((page) => page.label === label && page.trail.join(" › ") === trail.join(" › "));

  it("lists each section's pages with the path above them", () => {
    expect(find("Home", [])?.href).toBe("/dashboard");
    expect(find("Wallets", ["Money"])?.href).toBe("/balance/overview");
    expect(find("Balance", ["Money", "Wallets"])?.href).toBe("/balance/overview");
    expect(find("Statement", ["Money", "Wallets"])?.href).toBe("/balance/ledger");
    expect(find("Statement", ["Money", "Loans"])?.href).toBe("/loan-management/ledger");
  });

  it("keeps a page's query and its group's colour", () => {
    expect(find("Namaz", ["Habits"])?.href).toBe("/habit-tracker/habits?category=Namaz");
    expect(find("Statement", ["Money", "Loans"])?.tone).toBe("loans");
    expect(find("Statement", ["Money", "Wallets"])?.tone).toBe("money");
  });

  it("puts the foot under Account and Settings' sections under Account › Settings, once each", () => {
    expect(find("Invite & earn", ["Account@@user"])?.href).toBe("/referrals");
    expect(pages.filter((page) => page.label === "Profile")).toHaveLength(1);
    expect(find("Profile", ["Account@@user", "Settings"])?.href).toBe("/settings/profile");
    expect(find("Security", ["Account@@user", "Settings"])?.href).toBe("/settings/security");
  });

  it("gives every page its own key", () => {
    expect(new Set(pages.map((page) => page.key)).size).toBe(pages.length);
  });

  it("builds a leaf's link with its query", () => {
    expect(leafHref({ label: "Skills", href: "/habit-tracker/habits", query: { category: "Course" } })).toBe("/habit-tracker/habits?category=Course");
    expect(leafHref({ label: "Today", href: "/habit-tracker" })).toBe("/habit-tracker");
  });
});
