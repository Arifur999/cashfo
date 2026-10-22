import { describe, expect, it } from "vitest";
import { accountDisplayName, balanceText, displayLanguage } from "./accountDisplay";
import { formatCurrency, formatSignedCurrency } from "./currency";

describe("accountDisplayName", () => {
  it("shows the Bangla name to a Bangla reader, the English one otherwise", () => {
    const cash = { name: "Cash", nameBn: "নগদ" };
    expect(accountDisplayName(cash, displayLanguage("bn"))).toBe("নগদ");
    expect(accountDisplayName(cash, displayLanguage("en"))).toBe("Cash");
  });

  it("falls back to English when there is no Bangla name, or none was sent", () => {
    expect(accountDisplayName({ name: "UCB Bank", nameBn: null }, "BN")).toBe("UCB Bank");
    expect(accountDisplayName({ name: "UCB Bank" }, "BN")).toBe("UCB Bank");
  });
});

describe("balanceText", () => {
  it("writes a balance as it is, and an overdrawn one with a true minus", () => {
    expect(balanceText("2500", "BDT")).toBe(formatCurrency(2500, "BDT"));
    expect(balanceText(0, "BDT")).toBe(formatCurrency(0, "BDT"));
    expect(balanceText("-181600", "BDT")).toBe(formatSignedCurrency(-181600, "BDT"));
    expect(balanceText(-181600, "BDT").startsWith("− ")).toBe(true);
  });
});
