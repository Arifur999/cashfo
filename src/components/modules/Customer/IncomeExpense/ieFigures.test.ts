import { describe, expect, it } from "vitest";
import { budgetState, daysLeft, monthHref, monthRange, percentOf, readMonth, savingsRate } from "./ieFigures";

const NOW = { month: 10, year: 2026 };

describe("readMonth", () => {
  it("reads the address, or this month when it says none", () => {
    expect(readMonth({ month: "3", year: "2026" }, NOW)).toEqual({ month: 3, year: 2026 });
    expect(readMonth({}, NOW)).toEqual(NOW);
  });

  it("refuses a month that isn't one", () => {
    expect(readMonth({ month: "13", year: "2026" }, NOW)).toBeNull();
    expect(readMonth({ month: "x", year: "2026" }, NOW)).toBeNull();
    expect(readMonth({ month: "1", year: "1999" }, NOW)).toBeNull();
  });
});

describe("monthRange and monthHref", () => {
  it("gives a month's first and last day, leap years included", () => {
    expect(monthRange(2026, 10)).toEqual({ dateFrom: "2026-10-01", dateTo: "2026-10-31" });
    expect(monthRange(2028, 2)).toEqual({ dateFrom: "2028-02-01", dateTo: "2028-02-29" });
  });

  it("leaves this month out of the address and drops the page", () => {
    expect(monthHref("/income-expense", { month: "9", year: "2026" }, 10, 2026, NOW)).toBe("/income-expense");
    expect(monthHref("/transactions", { type: "EXPENSE", page: "3" }, 9, 2026, NOW)).toBe("/transactions?type=EXPENSE&month=9&year=2026");
  });
});

describe("savingsRate", () => {
  it("is what was kept of the income, one decimal", () => {
    expect(savingsRate(120500, 63000)).toBe(47.7);
    expect(savingsRate(1000, 1500)).toBe(-50);
  });

  it("is nothing when nothing came in", () => {
    expect(savingsRate(0, 500)).toBeNull();
  });
});

describe("budget figures", () => {
  it("says how far into the budget the month is", () => {
    expect(budgetState(79)).toBe("ON_TRACK");
    expect(budgetState(80)).toBe("NEAR_LIMIT");
    expect(budgetState(100)).toBe("NEAR_LIMIT");
    expect(budgetState(101)).toBe("OVER");
  });

  it("takes a whole percentage, 0 without a target", () => {
    expect(percentOf(63000, 70000)).toBe(90);
    expect(percentOf(500, null)).toBe(0);
    expect(percentOf(500, 0)).toBe(0);
  });

  it("counts the days left, today included", () => {
    expect(daysLeft(2026, 10, "2026-10-29")).toBe(3);
    expect(daysLeft(2026, 9, "2026-10-29")).toBe(0);
    expect(daysLeft(2026, 11, "2026-10-29")).toBe(30);
  });
});
