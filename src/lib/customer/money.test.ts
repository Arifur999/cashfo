import { describe, expect, it } from "vitest";
import { limitMoneyDecimals, normalizeMoneyInput, toEnglishDigits } from "./money";

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
