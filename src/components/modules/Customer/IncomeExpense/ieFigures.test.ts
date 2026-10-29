import { describe, expect, it } from "vitest";
import { budgetState, daysLeft, donutGradient, isDay, monthHref, monthRange, percentOf, periodHref, periodRange, planMatches, readMonth, readPeriod, savingsRate } from "./ieFigures";

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

describe("planMatches", () => {
  const row = ["October 2026", "৳ 1,20,000", "120000.00", "৳ 63,000"];
  it("finds a month by name, any case, word by word", () => {
    expect(planMatches("oct", row)).toBe(true);
    expect(planMatches("October 2026", row)).toBe(true);
    expect(planMatches("November", row)).toBe(false);
  });
  it("finds an amount with or without commas, in Bangla digits too", () => {
    expect(planMatches("1,20,000", row)).toBe(true);
    expect(planMatches("120000", row)).toBe(true);
    expect(planMatches("৬৩০০০", row)).toBe(true);
    expect(planMatches("99000", row)).toBe(false);
  });
  it("matches everything when nothing is typed", () => {
    expect(planMatches("  ", row)).toBe(true);
  });
});

describe("readPeriod", () => {
  it("reads a month, this month by default", () => {
    expect(readPeriod({}, NOW)).toEqual({ kind: "month", month: 10, year: 2026 });
    expect(readPeriod({ month: "3", year: "2025" }, NOW)).toEqual({ kind: "month", month: 3, year: 2025 });
  });

  it("reads a whole year and the reader's own days", () => {
    expect(readPeriod({ period: "year", year: "2025" }, NOW)).toEqual({ kind: "year", year: 2025 });
    expect(readPeriod({ from: "2026-08-01", to: "2026-10-28" }, NOW)).toEqual({ kind: "custom", from: "2026-08-01", to: "2026-10-28" });
  });

  it("refuses what isn't a period", () => {
    expect(readPeriod({ period: "year" }, NOW)).toBeNull();
    expect(readPeriod({ period: "week" }, NOW)).toBeNull();
    expect(readPeriod({ from: "2026-10-28", to: "2026-08-01" }, NOW)).toBeNull();
    expect(readPeriod({ from: "2026-02-30", to: "2026-03-01" }, NOW)).toBeNull();
    expect(readPeriod({ from: "2026-08-01" }, NOW)).toBeNull();
  });
});

describe("periodRange and periodHref", () => {
  it("gives each period its days", () => {
    expect(periodRange({ kind: "month", month: 2, year: 2026 })).toEqual({ dateFrom: "2026-02-01", dateTo: "2026-02-28" });
    expect(periodRange({ kind: "year", year: 2025 })).toEqual({ dateFrom: "2025-01-01", dateTo: "2025-12-31" });
    expect(periodRange({ kind: "custom", from: "2026-08-01", to: "2026-08-09" })).toEqual({ dateFrom: "2026-08-01", dateTo: "2026-08-09" });
  });

  it("writes each period's address, this month bare", () => {
    expect(periodHref("/income-expense", { kind: "month", month: 10, year: 2026 }, NOW)).toBe("/income-expense");
    expect(periodHref("/income-expense", { kind: "month", month: 9, year: 2026 }, NOW)).toBe("/income-expense?month=9&year=2026");
    expect(periodHref("/income-expense", { kind: "year", year: 2025 }, NOW)).toBe("/income-expense?period=year&year=2025");
    expect(periodHref("/income-expense", { kind: "custom", from: "2026-08-01", to: "2026-10-28" }, NOW)).toBe("/income-expense?from=2026-08-01&to=2026-10-28");
  });

  it("knows a real day", () => {
    expect(isDay("2024-02-29")).toBe(true);
    expect(isDay("2025-02-29")).toBe(false);
    expect(isDay("2025-2-1")).toBe(false);
  });
});

describe("donutGradient", () => {
  it("draws each share in order and closes the ring with the rest", () => {
    expect(donutGradient([{ amount: 50, color: "red" }, { amount: 30, color: "blue" }], 100, "grey", "none")).toBe("conic-gradient(red 0.00% 50.00%, blue 50.00% 80.00%, grey 80.00% 100%)");
    expect(donutGradient([{ amount: 100, color: "red" }], 100, "grey", "none")).toBe("conic-gradient(red 0.00% 100.00%)");
  });

  it("is a plain ring when there is nothing", () => {
    expect(donutGradient([], 0, "grey", "none")).toBe("none");
  });
});
