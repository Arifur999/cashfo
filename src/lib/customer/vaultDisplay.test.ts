import { describe, expect, it } from "vitest";
import type { VaultEntrySummary } from "./api";
import { avatarLetter, categoryCounts, countdownText, filterEntries, generatePassword, hostOf, normalizeUrl, parseExpiry, passwordStrength, rulesMet, sortEntries, vaultRules } from "./vaultDisplay";

const entry = (over: Partial<VaultEntrySummary> & { id: string; title: string }): VaultEntrySummary => ({ category: "OTHER", websiteUrl: null, holderName: null, usernameOrEmail: null, notes: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...over });

describe("passwords", () => {
  it("rates strength by length and variety", () => {
    expect(passwordStrength("")).toEqual({ score: 0, label: "Too short" });
    expect(passwordStrength("abc")).toEqual({ score: 1, label: "Too short" });
    expect(passwordStrength("abcdefg")).toEqual({ score: 1, label: "Weak" });
    expect(passwordStrength("abcdef12")).toEqual({ score: 2, label: "Fair" });
    expect(passwordStrength("Abcdef123456")).toEqual({ score: 3, label: "Good" });
    expect(passwordStrength("kP4!wX9m#Qe2zL7v")).toEqual({ score: 4, label: "Strong" });
    expect(passwordStrength("correct horse battery staple 1").score).toBe(4);
  });

  it("checks the vault password rules", () => {
    const rules = vaultRules("Vault1234", "Vault1234", "ChangeMe123!");
    expect(rules.map((r) => r.ok)).toEqual([true, true, true, true]);
    expect(rulesMet(rules)).toBe(true);
    expect(rulesMet(vaultRules("Vault1234", "Vault123", "ChangeMe123!"))).toBe(false);
    expect(vaultRules("ChangeMe123!", "ChangeMe123!", "ChangeMe123!").find((r) => r.key === "notAccount")?.ok).toBe(false);
    expect(vaultRules("onlyletters", "onlyletters", "x").find((r) => r.key === "mix")?.ok).toBe(false);
    expect(vaultRules("ab1", "ab1", "x").find((r) => r.key === "length")?.ok).toBe(false);
  });

  it("generates a password of the asked length from the sets picked", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    };
    const all = generatePassword(16, { upper: true, lower: true, digits: true, symbols: true, noLookalikes: true }, random);
    expect(all).toHaveLength(16);
    expect(all).toMatch(/[A-Z]/);
    expect(all).toMatch(/[a-z]/);
    expect(all).toMatch(/\d/);
    expect(all).toMatch(/[^A-Za-z0-9]/);
    expect(all).not.toMatch(/[0O1lI|]/);
    const digits = generatePassword(8, { upper: false, lower: false, digits: true, symbols: false, noLookalikes: false }, random);
    expect(digits).toMatch(/^\d{8}$/);
    // Nothing picked still gives something usable.
    expect(generatePassword(10, { upper: false, lower: false, digits: false, symbols: false, noLookalikes: false }, random)).toMatch(/^[a-z]{10}$/);
  });
});

describe("the unlock timer", () => {
  it("reads the API's expiry and counts down", () => {
    expect(parseExpiry("10m")).toBe(600_000);
    expect(parseExpiry("90s")).toBe(90_000);
    expect(parseExpiry("1h")).toBe(3_600_000);
    expect(parseExpiry("nonsense")).toBe(600_000);
    expect(countdownText(504_000)).toBe("8:24");
    expect(countdownText(59_400)).toBe("1:00");
    expect(countdownText(-5)).toBe("0:00");
  });
});

describe("the list", () => {
  const entries = [
    entry({ id: "1", title: "Facebook", category: "SOCIAL", usernameOrEmail: "shirin.akter.bd", websiteUrl: "https://facebook.com", createdAt: "2026-03-01T00:00:00.000Z", updatedAt: "2026-05-01T00:00:00.000Z" }),
    entry({ id: "2", title: "bKash", category: "BANK", usernameOrEmail: "01711-482915", createdAt: "2026-04-01T00:00:00.000Z", updatedAt: "2026-04-01T00:00:00.000Z" }),
    entry({ id: "3", title: "Daraz", category: "SHOPPING", websiteUrl: "daraz.com.bd", createdAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z" }),
  ];

  it("sorts three ways", () => {
    expect(sortEntries(entries, "az").map((e) => e.title)).toEqual(["bKash", "Daraz", "Facebook"]);
    expect(sortEntries(entries, "newest").map((e) => e.id)).toEqual(["2", "1", "3"]);
    expect(sortEntries(entries, "updated").map((e) => e.id)).toEqual(["3", "1", "2"]);
  });

  it("searches the title, login and website and filters by category", () => {
    expect(filterEntries(entries, "0171", "").map((e) => e.id)).toEqual(["2"]);
    expect(filterEntries(entries, "daraz.com", "").map((e) => e.id)).toEqual(["3"]);
    expect(filterEntries(entries, "", "SOCIAL").map((e) => e.id)).toEqual(["1"]);
    expect(filterEntries(entries, "face", "BANK")).toEqual([]);
    expect(categoryCounts(entries)).toMatchObject({ SOCIAL: 1, BANK: 1, SHOPPING: 1, OTHER: 0 });
  });

  it("shows a website as its host and fills in the scheme", () => {
    expect(hostOf("https://www.dutchbanglabank.com/login")).toBe("dutchbanglabank.com");
    expect(hostOf("daraz.com.bd")).toBe("daraz.com.bd");
    expect(hostOf(null)).toBe("");
    expect(normalizeUrl("rokomari.com")).toBe("https://rokomari.com");
    expect(normalizeUrl("http://x.test")).toBe("http://x.test");
    expect(normalizeUrl("  ")).toBe("");
    expect(avatarLetter("bKash")).toBe("B");
    expect(avatarLetter("  ")).toBe("?");
  });
});
