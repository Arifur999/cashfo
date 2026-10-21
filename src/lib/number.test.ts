import { describe, expect, it } from "vitest";
import { formatNumber, formatPercent } from "./number";

describe("formatNumber", () => {
  it("groups thousands with a fixed locale", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("falls back for missing or non-finite values", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(Number.NaN, "n/a")).toBe("n/a");
  });
});

describe("formatPercent", () => {
  it("rounds to one decimal by default", () => {
    expect(formatPercent(12.345)).toBe("12.3%");
  });
});
