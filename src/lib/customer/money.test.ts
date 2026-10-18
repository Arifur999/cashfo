import { describe, expect, it } from "vitest";
import { groupAmountInput, limitMoneyDecimals, normalizeMoneyInput, toEnglishDigits } from "./money";

describe("limitMoneyDecimals", () => {
  it("keeps up to two decimals as typed", () => {
    expect(limitMoneyDecimals("")).toBe("");
    expect(limitMoneyDecimals("12")).toBe("12");
    expect(limitMoneyDecimals("12.")).toBe("12.");
    expect(limitMoneyDecimals("12.5")).toBe("12.5");
    expect(limitMoneyDecimals("12.34")).toBe("12.34");
    expect(limitMoneyDecimals("-5.25")).toBe("-5.25");
  });

  it("drops a third decimal and beyond", () => {
    expect(limitMoneyDecimals("12.345")).toBe("12.34");
    expect(limitMoneyDecimals("0.019")).toBe("0.01");
    expect(limitMoneyDecimals("-1.999")).toBe("-1.99");
  });
});

describe("toEnglishDigits", () => {
  it("converts every Bangla digit", () => {
    expect(toEnglishDigits("০১২৩৪৫৬৭৮৯")).toBe("0123456789");
    expect(toEnglishDigits("২৫০০০.৫০")).toBe("25000.50");
  });

  it("leaves other text alone", () => {
    expect(toEnglishDigits("12.5 taka")).toBe("12.5 taka");
    expect(toEnglishDigits("")).toBe("");
  });
});

describe("normalizeMoneyInput", () => {
  it("converts digits, drops commas and letters, and limits decimals together", () => {
    expect(normalizeMoneyInput("২৫,০০০.৫৫৫")).toBe("25000.55");
    expect(normalizeMoneyInput("1,20,000")).toBe("120000");
    expect(normalizeMoneyInput("৳ 12.5")).toBe("12.5");
  });
});

describe("groupAmountInput", () => {
  it("groups the whole part the currency's way", () => {
    expect(groupAmountInput("1650000", "BDT")).toBe("16,50,000");
    expect(groupAmountInput("1650000", "USD")).toBe("1,650,000");
    expect(groupAmountInput("950", "BDT")).toBe("950");
    expect(groupAmountInput("0", "BDT")).toBe("0");
  });

  it("keeps the point and the decimals as they are typed", () => {
    expect(groupAmountInput("125000.", "BDT")).toBe("1,25,000.");
    expect(groupAmountInput("125000.5", "BDT")).toBe("1,25,000.5");
    expect(groupAmountInput(".5", "BDT")).toBe(".5");
    expect(groupAmountInput("", "BDT")).toBe("");
  });
});
