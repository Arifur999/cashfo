import { describe, expect, it } from "vitest";
import { accountPasswordRules, cleanLocalPhone, FAQS, fileNameFrom, fullPhone, GUIDES, knownIp, lastSignInOf, LEGAL_LINKS, localPhone, ownWorkspaces, samePhone, searchFaqs, sectionFor, sectionOf, signInResult, triedThePassword } from "./settingsDisplay";

describe("settings sections", () => {
  it("finds the section a path belongs to", () => {
    expect(sectionFor("/settings")).toBe("profile");
    expect(sectionFor("/settings/profile")).toBe("profile");
    expect(sectionFor("/settings/security")).toBe("security");
    expect(sectionFor("/settings/workspaces")).toBe("workspaces");
    expect(sectionFor("/settings/help")).toBe("help");
    expect(sectionFor("/elsewhere")).toBe("profile");
  });

  it("gives Profile the address the sidebar's Settings › Profile has", () => {
    expect(sectionOf("profile").href).toBe("/settings/profile");
    expect(sectionOf("app").label).toBe("App preferences");
  });
});

describe("account password rules", () => {
  it("checks length, mix, old password and match", () => {
    expect(accountPasswordRules("NewPass123", "NewPass123", "OldPass123").every((r) => r.ok)).toBe(true);
    expect(accountPasswordRules("short1", "short1", "x").find((r) => r.key === "length")?.ok).toBe(false);
    expect(accountPasswordRules("onlyletters", "onlyletters", "x").find((r) => r.key === "mix")?.ok).toBe(false);
    expect(accountPasswordRules("Same12345", "Same12345", "Same12345").find((r) => r.key === "notAccount")?.ok).toBe(false);
    expect(accountPasswordRules("NewPass123", "NewPass12", "x").find((r) => r.key === "match")?.ok).toBe(false);
  });

  it("refuses a password with the person's name in it", () => {
    expect(accountPasswordRules("Shirin2026x", "", "x", "Shirin Akter").find((r) => r.key === "noName")?.ok).toBe(false);
    expect(accountPasswordRules("Garden2026x", "", "x", "Shirin Akter").find((r) => r.key === "noName")?.ok).toBe(true);
  });

  it("finds the last sign-in that got in", () => {
    expect(lastSignInOf([{ success: false, createdAt: "b" }, { success: true, createdAt: "a" }])).toBe("a");
    expect(lastSignInOf([])).toBeNull();
  });
});

describe("phones", () => {
  it("splits a Bangladeshi number into the part after +880", () => {
    expect(localPhone("01711-482915")).toBe("1711-482915");
    expect(localPhone("+8801711482915")).toBe("1711482915");
    expect(localPhone("8801711482915")).toBe("1711482915");
    // Sign-up keeps a number as it was typed, spaces and all.
    expect(localPhone("+880 1711-482915")).toBe("1711-482915");
    expect(localPhone("01711 482915")).toBe("1711 482915");
  });

  it("keeps what the field can hold of a keystroke or a paste", () => {
    expect(cleanLocalPhone("+8801711482915")).toBe("1711482915");
    expect(cleanLocalPhone("8801711482915")).toBe("1711482915");
    expect(cleanLocalPhone("+880 1711-482915")).toBe("1711-482915");
    expect(cleanLocalPhone("01711 482915")).toBe("1711482915");
    expect(cleanLocalPhone("০১৭১১৪৮২৯১৫")).toBe("1711482915");
    expect(cleanLocalPhone("১৭১১-৪৮২৯১৫")).toBe("1711-482915");
    expect(cleanLocalPhone("1711-48a2915")).toBe("1711-482915");
    // Typed digit by digit, the country code waits for the next digit.
    expect(cleanLocalPhone("880")).toBe("880");
    expect(cleanLocalPhone("1711-482-915-555")).toHaveLength(14);
  });

  it("writes the whole number once, never +880 twice", () => {
    expect(fullPhone("1711-482915")).toBe("+8801711-482915");
    expect(fullPhone("01711482915")).toBe("+8801711482915");
    expect(fullPhone("8801711482915")).toBe("+8801711482915");
    expect(fullPhone("০১৭১১৪৮২৯১৫")).toBe("+8801711482915");
    expect(fullPhone("  ")).toBe("");
  });

  it("sees one number however it was written", () => {
    // The ways sign-up stores a number, against what the field gives back.
    for (const stored of ["01711-482915", "01711 482915", "+880 1711-482915", "+8801711482915"]) {
      expect(samePhone(fullPhone(cleanLocalPhone(stored)), stored), stored).toBe(true);
    }
    expect(samePhone("", "")).toBe(true);
    expect(samePhone("+8801711482915", "01711482916")).toBe(false);
    expect(samePhone("", "01711482915")).toBe(false);
  });
});

describe("workspaces", () => {
  it("counts personal and business workspaces, not groups", () => {
    expect(ownWorkspaces([{ type: "PERSONAL" }, { type: "BUSINESS" }, { type: "GROUP" }, { type: "GROUP" }])).toHaveLength(2);
  });
});

describe("sign-in history", () => {
  it("says why a try failed", () => {
    expect(signInResult({ success: true, failureReason: null })).toBe("Signed in");
    expect(signInResult({ success: false, failureReason: "invalid_password" })).toBe("Wrong password");
    expect(signInResult({ success: false, failureReason: "rate_limited" })).toBe("Blocked after too many tries");
    expect(signInResult({ success: false, failureReason: "account_suspended" })).toBe("Account was suspended");
    expect(signInResult({ success: false, failureReason: "account_not_found" })).toBe("Couldn't sign in");
    expect(signInResult({ success: false, failureReason: null })).toBe("Couldn't sign in");
  });

  it("offers a new password only where someone tried one", () => {
    expect(triedThePassword({ success: false, failureReason: "invalid_password" })).toBe(true);
    expect(triedThePassword({ success: false, failureReason: "rate_limited" })).toBe(true);
    expect(triedThePassword({ success: false, failureReason: "account_suspended" })).toBe(false);
    expect(triedThePassword({ success: true, failureReason: null })).toBe(false);
  });

  it("leaves out an address the API never had", () => {
    expect(knownIp("103.4.1.2")).toBe("103.4.1.2");
    expect(knownIp("unknown")).toBeNull();
    expect(knownIp("")).toBeNull();
    expect(knownIp(null)).toBeNull();
  });
});

describe("downloads", () => {
  it("reads the file name a download comes with", () => {
    expect(fileNameFrom('attachment; filename="smartly-data-2026-10-21.zip"')).toBe("smartly-data-2026-10-21.zip");
    expect(fileNameFrom("attachment; filename=smartly.zip")).toBe("smartly.zip");
    expect(fileNameFrom("attachment; filename*=UTF-8''smartly%20data.zip")).toBe("smartly data.zip");
    expect(fileNameFrom('attachment; filename="a.zip"; filename*=UTF-8\'\'b.zip')).toBe("b.zip");
    expect(fileNameFrom("attachment")).toBeNull();
    expect(fileNameFrom(null)).toBeNull();
  });
});

describe("help", () => {
  const t = (key: string) => key;
  it("matches the question or the answer", () => {
    expect(searchFaqs(FAQS, "", t)).toHaveLength(FAQS.length);
    expect(searchFaqs(FAQS, "void", t).map((f) => f.id)).toEqual(["void"]);
    expect(searchFaqs(FAQS, "30 days", t).map((f) => f.id)).toEqual(["referral"]);
    expect(searchFaqs(FAQS, "nothing here", t)).toEqual([]);
  });

  it("opens each guide on an answer about it", () => {
    const ids = new Set(FAQS.map((faq) => faq.id));
    for (const guide of GUIDES) expect(ids.has(guide.faqId), guide.title).toBe(true);
    expect(GUIDES.find((guide) => guide.title === "Budgets that work")?.faqId).toBe("budget");
    expect(GUIDES.find((guide) => guide.title === "Your first 10 minutes in Smartly")?.faqId).toBe("start");
  });
});

describe("resources", () => {
  it("names the legal pages as the Resources board does", () => {
    expect(LEGAL_LINKS.map((link) => link.title)).toEqual(["Terms of service", "Privacy policy", "Refund policy", "Cookie policy", "Community rules for groups"]);
  });
});
