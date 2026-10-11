import { describe, expect, it } from "vitest";
import { formatHours, formatNumber, formatPercent } from "./number";

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

describe("formatHours", () => {
  it("shows minutes under an hour", () => {
    expect(formatHours(0.4)).toBe("24m");
  });

  it("shows hours under two days, without a trailing .0", () => {
    expect(formatHours(5.25)).toBe("5.3h");
    expect(formatHours(5)).toBe("5h");
  });

  it("shows days from two days up", () => {
    expect(formatHours(72)).toBe("3d");
    expect(formatHours(60)).toBe("2.5d");
  });

  it("falls back for negative or missing values", () => {
    expect(formatHours(-1)).toBe("—");
    expect(formatHours(undefined)).toBe("—");
  });
});
