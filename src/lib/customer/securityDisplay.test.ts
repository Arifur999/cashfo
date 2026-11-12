import { describe, expect, it } from "vitest";
import { backupCodesFile, cleanBackupCode, cleanTotpCode, deletionItems, digitsInForce, groupSecret, sampleAmount, sampleDate, sampleNumber, shortWeekday, twoStepProblem, weekRun, type DeletionPreview } from "./securityDisplay";

describe("two-step codes", () => {
  it("keeps six digits of a typed or pasted code, Bangla digits too", () => {
    expect(cleanTotpCode("123 456")).toBe("123456");
    expect(cleanTotpCode("১২৩৪৫৬")).toBe("123456");
    expect(cleanTotpCode("12a3-4567")).toBe("123456");
  });

  it("puts a backup code's hyphen back", () => {
    expect(cleanBackupCode("AB12CD34")).toBe("ab12-cd34");
    expect(cleanBackupCode("ab12")).toBe("ab12");
    expect(cleanBackupCode("ab12-cd34-xx")).toBe("ab12-cd34");
  });

  it("groups the secret in fours", () => {
    expect(groupSecret("JBSWY3DPEHPK3PXP")).toBe("JBSW Y3DP EHPK 3PXP");
    expect(groupSecret("JBSW Y3DP EH")).toBe("JBSW Y3DP EH");
  });

  it("writes the codes one a line", () => {
    expect(backupCodesFile(["aaaa-bbbb", "cccc-dddd"], "a@b.c", "2026-10-28").split("\n")).toEqual(["Smartly backup codes for a@b.c", "Made 2026-10-28. Each code works once.", "", "aaaa-bbbb", "cccc-dddd", ""]);
  });

  it("words the API's refusals", () => {
    expect(twoStepProblem("CODE_WRONG", "x")).toMatch(/didn't work/);
    expect(twoStepProblem("RECENT_SIGN_IN_REQUIRED", "x")).toMatch(/sign in again/);
    expect(twoStepProblem(undefined, "Fallback")).toBe("Fallback");
  });
});

describe("delete my account", () => {
  const preview: DeletionPreview = { wallets: 3, transactions: 10, savingsGoals: 1, assets: 0, loanContacts: 0, groups: 0, vaultEntries: 2, referralAvailable: null, deletionDate: "2026-11-27T00:00:00Z", graceDays: 30 };

  it("lists the referral money only while there is some", () => {
    expect(deletionItems(preview).map((item) => item.key)).toEqual(["money", "plans", "groups", "vault"]);
    expect(deletionItems({ ...preview, referralAvailable: "224.00" }).at(-1)).toMatchObject({ key: "referral", amount: "224.00" });
    expect(deletionItems({ ...preview, referralAvailable: "0.00" })).toHaveLength(4);
  });
});

describe("numbers and dates", () => {
  it("follows the language until digits are chosen", () => {
    expect(digitsInForce(null, "en")).toBe("LATIN");
    expect(digitsInForce(null, "bn")).toBe("BENGALI");
    expect(digitsInForce("LATIN", "bn")).toBe("LATIN");
  });

  it("groups lakh and crore, or in threes, in either digits", () => {
    expect(sampleNumber(123456, "LAKH", "LATIN")).toBe("1,23,456");
    expect(sampleNumber(123456, "INTERNATIONAL", "LATIN")).toBe("123,456");
    expect(sampleNumber(123456, "LAKH", "BENGALI")).toBe("১,২৩,৪৫৬");
    expect(sampleAmount(123456, "INTERNATIONAL", "LATIN", "en")).toBe("Tk 123,456");
    expect(sampleAmount(123456, "LAKH", "BENGALI", "bn")).toBe("৳ ১,২৩,৪৫৬");
  });

  it("writes a day in each date style", () => {
    expect(sampleDate("2026-10-02", "D_MMM_YYYY", "LATIN")).toBe("2 Oct 2026");
    expect(sampleDate("2026-10-02", "DD_MM_YYYY", "LATIN")).toBe("02/10/2026");
    expect(sampleDate("2026-10-02", "YYYY_MM_DD", "BENGALI")).toBe("২০২৬-১০-০২");
    expect(shortWeekday("2026-10-02")).toBe("Fri");
  });

  it("runs the week from its first day", () => {
    expect(weekRun("SATURDAY")).toEqual(["Saturday", "Friday"]);
    expect(weekRun("SUNDAY")).toEqual(["Sunday", "Saturday"]);
    expect(weekRun("MONDAY")).toEqual(["Monday", "Sunday"]);
  });
});
