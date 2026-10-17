import { describe, expect, it } from "vitest";
import { formatCurrency } from "./currency";

const NBSP = " ";

describe("formatCurrency", () => {
  it("writes taka as the design does, symbol first", () => {
    expect(formatCurrency(6214.5)).toBe(`৳${NBSP}6,214.50`);
    expect(formatCurrency("72155.00", "BDT", 0)).toBe(`৳${NBSP}72,155`);
  });

  it("leads with the sign and never shows a negative zero", () => {
    expect(formatCurrency(-1500)).toBe(`-৳${NBSP}1,500.00`);
    expect(formatCurrency(0)).toBe(`৳${NBSP}0.00`);
  });

  it("falls back to zero for anything that is not a number", () => {
    expect(formatCurrency(null)).toBe(`৳${NBSP}0.00`);
    expect(formatCurrency("abc")).toBe(`৳${NBSP}0.00`);
  });

  it("keeps the international form for other currencies", () => {
    expect(formatCurrency(5, "USD")).toBe("$5.00");
  });
});
