import { describe, expect, it } from "vitest";
import type { VaultEntrySummary } from "./api";
import {
  attentionIds,
  avatarLetter,
  categoryCounts,
  checkupBreakdown,
  checkupFor,
  checkupStatus,
  chipViews,
  countdownText,
  draftFor,
  draftProblems,
  entriesInView,
  entryInput,
  filterEntries,
  generatePassword,
  hostOf,
  isLockedMessage,
  issuesOf,
  nameParts,
  normalizeUrl,
  NO_CONNECTION_MESSAGE,
  parseExpiry,
  passwordAge,
  passwordDetail,
  passwordStrength,
  presetTitle,
  QUICK_LOGINS,
  rulesMet,
  sharesWith,
  safetyOf,
  serviceSuggestions,
  settle,
  sortEntries,
  toggledView,
  vaultHealth,
  vaultRules,
} from "./vaultDisplay";

const entry = (over: Partial<VaultEntrySummary> & { id: string; title: string }): VaultEntrySummary => ({
  category: "OTHER",
  websiteUrl: null,
  holderName: null,
  usernameOrEmail: null,
  notes: null,
  passwordChangedAt: "2026-01-01T00:00:00.000Z",
  isFavorite: false,
  checkupDismissedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

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

  it("words the meter's detail as one sentence per case", () => {
    expect(passwordDetail("")).toBeNull();
    expect(passwordDetail("7")).toEqual({ key: "{count} character", count: 1 });
    expect(passwordDetail("abcdef")).toEqual({ key: "{count} characters", count: 6 });
    expect(passwordDetail("48215")).toEqual({ key: "{count} characters with numbers", count: 5 });
    expect(passwordDetail("kP4!wX9m#Qe2zL7v")).toEqual({ key: "{count} characters with numbers and symbols", count: 16 });
  });

  it("checks the vault password rules", () => {
    const rules = vaultRules("Vault1234", "Vault1234", "ChangeMe123!", "Shirin Akter");
    expect(rules.map((r) => r.ok)).toEqual([true, true, true, true, true]);
    expect(rulesMet(rules)).toBe(true);
    expect(rulesMet(vaultRules("Vault1234", "Vault123", "ChangeMe123!"))).toBe(false);
    expect(vaultRules("ChangeMe123!", "ChangeMe123!", "ChangeMe123!").find((r) => r.key === "notAccount")?.ok).toBe(false);
    expect(vaultRules("onlyletters", "onlyletters", "x").find((r) => r.key === "mix")?.ok).toBe(false);
    // Eight characters at least, as the API asks now.
    expect(vaultRules("abc1234", "abc1234", "x").find((r) => r.key === "length")?.ok).toBe(false);
    expect(vaultRules("abcd1234", "abcd1234", "x").find((r) => r.key === "length")?.ok).toBe(true);
    // The name's runs of three letters or more, in any case; "Md" alone is no name part.
    expect(vaultRules("shirin2026", "shirin2026", "x", "Shirin Akter").find((r) => r.key === "noName")?.ok).toBe(false);
    expect(vaultRules("garden md 77", "garden md 77", "x", "Md Rafiq").find((r) => r.key === "noName")?.ok).toBe(true);
    expect(nameParts("Md. Rafiqul Islam")).toEqual(["rafiqul", "islam"]);
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

describe("answers", () => {
  it("knows every way the API says the vault is shut", () => {
    expect(isLockedMessage("Vault is locked")).toBe(true);
    expect(isLockedMessage("Vault session expired -- please unlock again")).toBe(true);
    expect(isLockedMessage("Incorrect vault password")).toBe(false);
    expect(isLockedMessage("Set up a vault password first")).toBe(false);
    expect(isLockedMessage(NO_CONNECTION_MESSAGE)).toBe(false);
    expect(isLockedMessage(undefined)).toBe(false);
  });

  it("reads a call that never got an answer as a failed one", async () => {
    await expect(settle(Promise.resolve({ success: true, data: 3 }))).resolves.toEqual({ success: true, data: 3 });
    await expect(settle(Promise.resolve({ success: false, message: "Vault entry not found" }))).resolves.toEqual({ success: false, message: "Vault entry not found" });
    await expect(settle(Promise.reject(new TypeError("Failed to fetch")))).resolves.toEqual({ success: false, message: NO_CONNECTION_MESSAGE });
  });
});

describe("the list", () => {
  const entries = [
    entry({ id: "1", title: "Facebook", category: "SOCIAL", usernameOrEmail: "shirin.akter.bd", websiteUrl: "https://facebook.com", isFavorite: true, createdAt: "2026-03-01T00:00:00.000Z", updatedAt: "2026-05-01T00:00:00.000Z" }),
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

  it("shows one view at a time: all, starred, flagged or a category", () => {
    const flagged = new Set(["2"]);
    expect(entriesInView(entries, "", flagged)).toHaveLength(3);
    expect(entriesInView(entries, "FAVORITES", flagged).map((e) => e.id)).toEqual(["1"]);
    expect(entriesInView(entries, "ATTENTION", flagged).map((e) => e.id)).toEqual(["2"]);
    expect(entriesInView(entries, "SHOPPING", flagged).map((e) => e.id)).toEqual(["3"]);
  });

  it("offers chips for the categories that hold a login, and toggles a category off", () => {
    const counts = categoryCounts(entries);
    const order = ["SOCIAL", "EMAIL", "BANK", "SHOPPING", "OTHER"] as const;
    expect(chipViews(counts, "", [...order])).toEqual(["", "FAVORITES", "ATTENTION", "SOCIAL", "BANK", "SHOPPING"]);
    // The category on show stays, even emptied.
    expect(chipViews(counts, "EMAIL", [...order])).toContain("EMAIL");
    expect(toggledView("BANK", "BANK")).toBe("");
    expect(toggledView("", "BANK")).toBe("BANK");
    expect(toggledView("FAVORITES", "FAVORITES")).toBe("FAVORITES");
  });

  it("shows a website as its host and fills in the scheme", () => {
    expect(hostOf("https://www.dutchbanglabank.com/login")).toBe("dutchbanglabank.com");
    expect(hostOf("daraz.com.bd")).toBe("daraz.com.bd");
    expect(hostOf(null)).toBe("");
    expect(normalizeUrl("rokomari.com")).toBe("https://rokomari.com");
    expect(normalizeUrl("http://x.test")).toBe("http://x.test");
    expect(normalizeUrl("  ")).toBe("");
    // Only a web address: no other scheme can be opened or saved.
    expect(normalizeUrl("javascript://%0aalert(1)")).toBe("");
    expect(normalizeUrl("data:text/html,x")).toBe("");
    expect(normalizeUrl("localhost:3000/login")).toBe("https://localhost:3000/login");
    expect(avatarLetter("bKash")).toBe("b");
    expect(avatarLetter("e-TIN portal")).toBe("e");
    expect(avatarLetter(" Facebook")).toBe("F");
    expect(avatarLetter("  ")).toBe("?");
  });
});

describe("checkup", () => {
  const checkup = { weak: ["c"], reused: ["a", "c"], old: ["d"] };
  it("says what a login needs, worst first, and who needs anything", () => {
    expect(issuesOf(checkup, "c")).toEqual(["reused", "weak"]);
    expect(issuesOf(null, "c")).toEqual([]);
    expect([...attentionIds(checkup)].sort()).toEqual(["a", "c", "d"]);
  });

  it("forgets logins deleted since it ran", () => {
    const left = [entry({ id: "a", title: "A" }), entry({ id: "d", title: "D" })];
    expect(checkupFor(left, checkup)).toEqual({ weak: [], reused: ["a"], old: ["d"] });
    expect(checkupFor(left, null)).toBeNull();
  });

  it("names the logins that share a password, and drops a set a delete left with one", () => {
    const logins = [entry({ id: "a", title: "Facebook" }), entry({ id: "b", title: "Instagram" }), entry({ id: "c", title: "Gmail" })];
    const found = { weak: [], reused: ["a", "b", "c", "d"], old: [], reusedGroups: [["a", "b", "c"], ["d", "e"]] };
    const kept = checkupFor(logins, found);
    expect(kept?.reusedGroups).toEqual([["a", "b", "c"]]);
    expect(sharesWith(logins, kept, "a")).toEqual(["Instagram", "Gmail"]);
    expect(sharesWith(logins, kept, "x")).toEqual([]);
    // An older backend sends no sets: nothing to name.
    expect(sharesWith(logins, { weak: [], reused: ["a", "b"], old: [] }, "a")).toEqual([]);
  });

  it("counts each login once, by its worst issue, so the bar adds up", () => {
    // Four logins; two share a weak password.
    const four = ["a", "b", "c", "e"].map((id) => entry({ id, title: id }));
    const tally = checkupBreakdown(four, { weak: ["a", "b"], reused: ["a", "b"], old: [] });
    expect(tally).toEqual({ fine: 2, reused: 2, weak: 0, old: 0 });
    expect(tally.fine + tally.reused + tally.weak + tally.old).toBe(four.length);
    expect(checkupBreakdown(four, null)).toEqual({ fine: 4, reused: 0, weak: 0, old: 0 });
  });

  it("is loading until it answers, and a failed run claims nothing", () => {
    const logins = [entry({ id: "a", title: "A" })];
    expect(checkupStatus(null, logins, 0)).toEqual({ load: "loading", found: null });
    expect(checkupStatus({ entries: logins, attempt: 0, found: checkup }, logins, 0)).toEqual({ load: "ready", found: checkup });
    expect(checkupStatus({ entries: logins, attempt: 0, found: null }, logins, 0)).toEqual({ load: "failed", found: null });
  });

  it("keeps the last findings while it runs again, but not a failure", () => {
    const before = [entry({ id: "a", title: "A" })];
    const after = [...before, entry({ id: "b", title: "B" })];
    // A login was added: the run for it is on its way.
    expect(checkupStatus({ entries: before, attempt: 0, found: checkup }, after, 0)).toEqual({ load: "ready", found: checkup });
    // After a failure, a run for the new list, or Try again, is loading.
    expect(checkupStatus({ entries: before, attempt: 0, found: null }, after, 0).load).toBe("loading");
    expect(checkupStatus({ entries: before, attempt: 0, found: null }, before, 1).load).toBe("loading");
  });
});

describe("saving a login", () => {
  const saved = entry({ id: "9", title: "Dutch Bangla Bank", category: "BANK", websiteUrl: "https://dutchbanglabank.com", usernameOrEmail: "shirin", holderName: "Shirin Akter", notes: "Recovery code 4821", isFavorite: true });

  it("starts from the login, a quick pick or nothing", () => {
    expect(draftFor(saved)).toMatchObject({ editing: saved, title: "Dutch Bangla Bank", website: "https://dutchbanglabank.com", username: "shirin", holder: "Shirin Akter", holderOpen: true, favorite: true, password: "", kept: false });
    const bkash = QUICK_LOGINS.find((preset) => preset.title === "bKash")!;
    expect(draftFor(null, bkash)).toMatchObject({ editing: null, title: "bKash", category: "MOBILE_BANKING", website: "bkash.com", holderOpen: false });
    expect(draftFor(null)).toMatchObject({ title: "", category: "OTHER" });
  });

  it("translates only the quick logins that aren't a brand", () => {
    const shout = (key: string) => key.toUpperCase();
    expect(presetTitle(QUICK_LOGINS.find((preset) => preset.title === "Home Wi-Fi")!, shout)).toBe("HOME WI-FI");
    expect(presetTitle(QUICK_LOGINS.find((preset) => preset.title === "Facebook")!, shout)).toBe("Facebook");
  });

  it("leaves out what is empty on a new login", () => {
    const draft = { ...draftFor(null), title: " bKash ", category: "MOBILE_BANKING" as const, password: "48215", notes: "  " };
    expect(entryInput(draft)).toEqual({ title: "bKash", category: "MOBILE_BANKING", websiteUrl: undefined, usernameOrEmail: undefined, holderName: undefined, notes: undefined, isFavorite: false, password: "48215" });
  });

  it("sends null for a field emptied on an edit, so the old value goes", () => {
    const draft = { ...draftFor(saved), username: "", notes: "", website: " ", holderOpen: false };
    const input = entryInput(draft);
    expect(input).toMatchObject({ websiteUrl: null, usernameOrEmail: null, holderName: null, notes: null });
    // No password typed: the saved one stays.
    expect(input).not.toHaveProperty("password");
    expect(entryInput({ ...draftFor(saved), website: "rokomari.com" }).websiteUrl).toBe("https://rokomari.com");
  });

  it("asks for a name, and a password only on a new login, of any length", () => {
    expect(draftProblems(draftFor(null))).toEqual({ title: "Give this login a name", password: "Type or generate a password" });
    expect(draftProblems({ ...draftFor(null), title: "Nagad", password: "4821" })).toEqual({});
    expect(draftProblems({ ...draftFor(saved), title: "  " })).toEqual({ title: "Give this login a name" });
  });
});

describe("the redesigned vault (v9)", () => {
  const entries = [
    entry({ id: "1", title: "Facebook" }),
    entry({ id: "2", title: "Instagram" }),
    entry({ id: "3", title: "Home Wi-Fi" }),
    entry({ id: "4", title: "Gmail" }),
  ];
  const checkup = { reused: ["1", "2"], weak: ["3", "2"], old: ["4"] };

  it("puts the logins with the most problems first", () => {
    expect(sortEntries(entries, "fix", checkup).map((e) => e.title)).toEqual(["Instagram", "Facebook", "Gmail", "Home Wi-Fi"]);
    expect(sortEntries(entries, "fix", null).map((e) => e.title)).toEqual(["Facebook", "Gmail", "Home Wi-Fi", "Instagram"]);
  });

  it("filters by one problem from the health bar, and a second press clears it", () => {
    expect(entriesInView(entries, "WEAK", attentionIds(checkup), checkup).map((e) => e.id)).toEqual(["2", "3"]);
    expect(entriesInView(entries, "OLD", attentionIds(checkup), checkup).map((e) => e.id)).toEqual(["4"]);
    expect(toggledView("REUSED", "REUSED")).toBe("");
    expect(toggledView("", "REUSED")).toBe("REUSED");
  });

  it("badges a login by its worst problem, Safe without one, and nothing before the checkup", () => {
    expect(safetyOf(checkup, "2")).toBe("reused");
    expect(safetyOf(checkup, "3")).toBe("weak");
    expect(safetyOf({ reused: [], weak: [], old: [] }, "3")).toBe("safe");
    expect(safetyOf(null, "3")).toBeNull();
  });

  it("scores the vault's health", () => {
    expect(vaultHealth([...entries, entry({ id: "5", title: "Daraz" })], checkup)).toEqual({ total: 5, safe: 1, flagged: 4, percent: 20, reused: 2, weak: 2, old: 1 });
    expect(vaultHealth([], { reused: [], weak: [], old: [] }).percent).toBe(100);
  });

  it("says a password's age", () => {
    const now = new Date("2026-11-01T10:00:00.000Z");
    expect(passwordAge("2026-11-01T02:00:00.000Z", now)).toEqual({ key: "Today", count: 0 });
    expect(passwordAge("2026-10-20T02:00:00.000Z", now)).toEqual({ key: "{count} days ago", count: 12 });
    expect(passwordAge("2026-09-25T02:00:00.000Z", now)).toEqual({ key: "{count} month ago", count: 1 });
    expect(passwordAge("2025-08-01T02:00:00.000Z", now)).toEqual({ key: "{count} months ago", count: 15 });
  });

  it("suggests popular services for the Name box", () => {
    expect(serviceSuggestions("").map((s) => s.title)).toHaveLength(8);
    expect(serviceSuggestions("na").map((s) => s.title)).toEqual(["Nagad"]);
    expect(serviceSuggestions("Facebook")).toEqual([]);
    expect(serviceSuggestions("wi").find((s) => s.category === "WIFI")?.website).toBe("");
  });
});
