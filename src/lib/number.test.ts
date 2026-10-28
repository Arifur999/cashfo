import { describe, expect, it } from "vitest";
import { formatBytes, formatNumber, formatPercent } from "./number";

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

describe("formatBytes", () => {
  it("says a size in the largest whole unit, one decimal under ten", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(19_921_943)).toBe("19 MB");
    expect(formatBytes(3_435_973_837)).toBe("3.2 GB");
  });
});
