import { describe, expect, it } from "vitest";
import { isDebitPositive, ledgerDirection } from "./ledger";

describe("isDebitPositive", () => {
  it("is true for assets and expenses only", () => {
    expect(isDebitPositive("ASSET")).toBe(true);
    expect(isDebitPositive("EXPENSE")).toBe(true);
    expect(isDebitPositive("INCOME")).toBe(false);
    expect(isDebitPositive("LIABILITY")).toBe(false);
    expect(isDebitPositive("EQUITY")).toBe(false);
  });
});

describe("ledgerDirection", () => {
  it("reads a debit to a wallet as money in", () => {
    expect(ledgerDirection("DEBIT", "ASSET")).toBe("in");
    expect(ledgerDirection("CREDIT", "ASSET")).toBe("out");
  });

  it("reads a credit to an income account as money in", () => {
    expect(ledgerDirection("CREDIT", "INCOME")).toBe("in");
    expect(ledgerDirection("DEBIT", "INCOME")).toBe("out");
  });
});
