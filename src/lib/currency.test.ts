import { describe, expect, it } from "vitest";
import { formatAmount, formatCurrency } from "./currency";
import { toBanglaDigits } from "@/lib/i18n/banglaDates";

const NBSP = " ";

describe("formatCurrency", () => {
  it("writes taka as the design does, symbol first", () => {
    expect(formatCurrency(6214.5)).toBe(`TK${NBSP}6,214.50`);
    expect(formatCurrency("72155.00", "BDT", 0)).toBe(`TK${NBSP}72,155`);
  });

  it("leads with the sign and never shows a negative zero", () => {
    expect(formatCurrency(-1500)).toBe(`-TK${NBSP}1,500.00`);
    expect(formatCurrency(0)).toBe(`TK${NBSP}0.00`);
  });

  it("falls back to zero for anything that is not a number", () => {
    expect(formatCurrency(null)).toBe(`TK${NBSP}0.00`);
    expect(formatCurrency("abc")).toBe(`TK${NBSP}0.00`);
  });

  it("keeps the international form for other currencies", () => {
    expect(formatCurrency(5, "USD")).toBe("$5.00");
  });
});

describe("formatAmount", () => {
  it("leaves the paisa off a whole amount", () => {
    expect(formatAmount(299)).toBe(`TK${NBSP}299`);
    expect(formatAmount("1500.00")).toBe(`TK${NBSP}1,500`);
  });

  it("keeps both paisa digits when there are some", () => {
    expect(formatAmount(2699.1)).toBe(`TK${NBSP}2,699.10`);
  });

  it("treats what is not a number as zero", () => {
    expect(formatAmount(null)).toBe(`TK${NBSP}0`);
  });
});

describe("formatAmount in Bangla", () => {
  it("prints Bangla digits", () => {
    // Bangla keeps taka's own sign, where English writes "TK".
    expect(formatAmount(2699.1, "BDT", "bn")).toBe(toBanglaDigits(formatAmount(2699.1)).replace("TK", "৳"));
    expect(formatCurrency(-1500, "BDT", 0, "bn")).toBe(`-৳${NBSP}১,৫০০`);
    expect(formatAmount(299, "BDT", "bn")).toContain("২৯৯");
  });
});
