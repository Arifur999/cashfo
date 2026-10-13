import { describe, expect, it } from "vitest";
import { currencySymbol, formatCurrency } from "./currency";

describe("formatCurrency", () => {
  it("groups taka in lakhs and crores", () => {
    expect(formatCurrency(1250000, "BDT")).toBe("৳ 12,50,000.00");
    expect(formatCurrency("123456789.5", "BDT")).toBe("৳ 12,34,56,789.50");
    expect(formatCurrency(999, "BDT")).toBe("৳ 999.00");
  });

  it("groups dollars the international way", () => {
    expect(formatCurrency(1250000, "USD")).toBe("$ 1,250,000.00");
  });

  it("puts the sign first", () => {
    expect(formatCurrency(-1500, "BDT")).toBe("-৳ 1,500.00");
  });

  it("names an unknown currency by its code", () => {
    expect(formatCurrency(10, "EUR")).toBe("EUR 10.00");
  });

  it("reads a broken amount as zero", () => {
    expect(formatCurrency("not a number", "BDT")).toBe("৳ 0.00");
  });
});

describe("currencySymbol", () => {
  it("is just the symbol, for an amount input's prefix", () => {
    expect(currencySymbol("BDT")).toBe("৳");
    expect(currencySymbol("USD")).toBe("$");
  });
});
