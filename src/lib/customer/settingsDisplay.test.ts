import { describe, expect, it } from "vitest";
import { accountPasswordRules, FAQS, fullPhone, initialsOf, localPhone, searchFaqs, sectionFor } from "./settingsDisplay";

describe("settings sections", () => {
  it("finds the section a path belongs to", () => {
    expect(sectionFor("/settings")).toBe("profile");
    expect(sectionFor("/settings/security")).toBe("security");
    expect(sectionFor("/settings/workspaces")).toBe("workspaces");
    expect(sectionFor("/settings/help")).toBe("help");
    expect(sectionFor("/elsewhere")).toBe("profile");
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
});

describe("names and phones", () => {
  it("makes initials and splits a Bangladeshi number", () => {
    expect(initialsOf("Khaled Mahmud")).toBe("KM");
    expect(initialsOf("Shirin")).toBe("S");
    expect(localPhone("01711-482915")).toBe("1711-482915");
    expect(localPhone("+8801711482915")).toBe("1711482915");
    expect(localPhone("8801711482915")).toBe("1711482915");
    expect(fullPhone("1711-482915")).toBe("+8801711-482915");
    expect(fullPhone("01711482915")).toBe("+8801711482915");
    expect(fullPhone("  ")).toBe("");
  });
});

describe("help search", () => {
  const t = (key: string) => key;
  it("matches the question or the answer", () => {
    expect(searchFaqs(FAQS, "", t)).toHaveLength(FAQS.length);
    expect(searchFaqs(FAQS, "void", t).map((f) => f.id)).toEqual(["void"]);
    expect(searchFaqs(FAQS, "30 days", t).map((f) => f.id)).toEqual(["referral"]);
    expect(searchFaqs(FAQS, "nothing here", t)).toEqual([]);
  });
});
