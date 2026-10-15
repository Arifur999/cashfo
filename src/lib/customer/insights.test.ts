import { describe, expect, it } from "vitest";
import type { CategoryBreakdown, MonthlyBreakdown } from "./api";
import { biggestDrop, biggestPart, categoryMoves, concentrationNote, insightPeriodFrom, monthRates, monthSpan, netWorth, percentChange, periodTotals, previousRange, rankedRows, rateTrend } from "./insights";

const breakdown = (type: "INCOME" | "EXPENSE", rows: [string, number][]): CategoryBreakdown => ({
  type,
  total: rows.reduce((sum, [, amount]) => sum + amount, 0).toFixed(2),
  categories: rows.map(([name, amount]) => ({ name, amount: amount.toFixed(2), percent: 0, color: "green" })),
});

const monthly = (type: "INCOME" | "EXPENSE", months: string[], totals: number[]): MonthlyBreakdown => ({
  type,
  months,
  rows: [],
  totals: totals.map((t) => t.toFixed(2)),
  total: totals.reduce((a, b) => a + b, 0).toFixed(2),
});

describe("previousRange", () => {
  it("steps whole months back by the length of the range", () => {
    expect(previousRange({ dateFrom: "2026-10-01", dateTo: "2026-10-15" }, "this-month")).toEqual({ dateFrom: "2026-09-01", dateTo: "2026-09-30" });
    expect(previousRange({ dateFrom: "2026-09-01", dateTo: "2026-09-30" }, "last-month")).toEqual({ dateFrom: "2026-08-01", dateTo: "2026-08-31" });
    expect(previousRange({ dateFrom: "2026-08-01", dateTo: "2026-10-15" }, "last-3-months")).toEqual({ dateFrom: "2026-05-01", dateTo: "2026-07-31" });
    expect(previousRange({ dateFrom: "2026-01-01", dateTo: "2026-02-10" }, "last-3-months")).toEqual({ dateFrom: "2025-11-01", dateTo: "2025-12-31" });
  });

  it("compares this year with the same months of last year", () => {
    expect(previousRange({ dateFrom: "2026-01-01", dateTo: "2026-10-15" }, "this-year")).toEqual({ dateFrom: "2025-01-01", dateTo: "2025-10-31" });
    expect(monthSpan({ dateFrom: "2026-01-01", dateTo: "2026-10-15" })).toBe(10);
  });
});

describe("totals and changes", () => {
  it("knows what was left and the share kept", () => {
    expect(periodTotals(breakdown("INCOME", [["Salary", 85000]]), breakdown("EXPENSE", [["Food", 52300]]))).toEqual({ income: 85000, expense: 52300, left: 32700, rate: 38 });
    expect(periodTotals(breakdown("INCOME", []), breakdown("EXPENSE", [["Food", 100]])).rate).toBeNull();
  });

  it("measures a change against what came before", () => {
    expect(percentChange(85000, 80000)).toBe(6.3);
    expect(percentChange(52300, 54500)).toBe(-4);
    expect(percentChange(100, 0)).toBeNull();
  });
});

describe("rankedRows and concentrationNote", () => {
  const income = breakdown("INCOME", [["Freelance", 104000], ["Salary", 660000], ["Shop rent", 36000], ["Gifts", 24000]]);

  it("ranks biggest first with shares and bar widths", () => {
    const rows = rankedRows(income);
    expect(rows.map((r) => [r.rank, r.name, r.share, r.width])).toEqual([
      [1, "Salary", 80.1, 100],
      [2, "Freelance", 12.6, 15.8],
      [3, "Shop rent", 4.4, 5.5],
      [4, "Gifts", 2.9, 3.6],
    ]);
  });

  it("warns when one source is over 60%, naming how the runner-up moved", () => {
    const before = breakdown("INCOME", [["Salary", 600000], ["Freelance", 80000]]);
    expect(concentrationNote(income, before)).toEqual({ name: "Salary", percent: 80, second: { name: "Freelance", before: 80000, now: 104000 } });
    expect(concentrationNote(breakdown("INCOME", [["Salary", 50], ["Shop", 50]]), before)).toBeNull();
    expect(concentrationNote(breakdown("INCOME", [["Salary", 50]]), before)?.second).toBeNull();
  });
});

describe("categoryMoves and biggestDrop", () => {
  const now = breakdown("EXPENSE", [["Transport", 7200], ["Shopping", 4400], ["Food", 16800]]);
  const before = breakdown("EXPENSE", [["Transport", 17000], ["Shopping", 3100], ["Food", 16800], ["Health", 900]]);

  it("lists every category by the size of its move", () => {
    expect(categoryMoves(now, before).map((m) => [m.name, m.change, m.percent])).toEqual([
      ["Transport", -9800, -57.6],
      ["Shopping", 1300, 41.9],
      ["Health", -900, -100],
      ["Food", 0, 0],
    ]);
  });

  it("finds the biggest fall, or nothing when everything rose", () => {
    expect(biggestDrop(now, before)?.name).toBe("Transport");
    expect(biggestDrop(before, breakdown("EXPENSE", []))).toBeNull();
  });
});

describe("monthRates and rateTrend", () => {
  const months = ["2026-05", "2026-06", "2026-07"];
  const income = monthly("INCOME", months, [80000, 80000, 0]);
  const expense = monthly("EXPENSE", months, [56800, 60800, 1000]);

  it("works out what was kept each month", () => {
    const rates = monthRates(income, expense);
    expect(rates.map((r) => [r.month, r.kept, r.rate])).toEqual([
      ["2026-05", 23200, 29],
      ["2026-06", 19200, 24],
      ["2026-07", -1000, null],
    ]);
  });

  it("says whether the share kept went up since the first month", () => {
    expect(rateTrend(monthRates(income, expense))).toEqual({ up: false, points: 5, since: "2026-05" });
    expect(rateTrend(monthRates(monthly("INCOME", ["2026-07"], [100]), monthly("EXPENSE", ["2026-07"], [50])))).toBeNull();
  });
});

describe("netWorth", () => {
  it("adds what you have and takes off what you owe", () => {
    const worth = netWorth({ wallets: 66750, savings: 160000, assets: 5720000, owedToYou: 125000, youOwe: -600000 });
    expect(worth.total).toBe(5471750);
    expect(worth.have).toBe(6071750);
    expect(worth.youOwe).toBe(600000);
    expect(worth.haveShare).toBe(91);
    expect(biggestPart(worth)).toBe("assets");
  });

  it("is all green with nothing owed, and has no biggest part when empty", () => {
    expect(netWorth({ wallets: 0, savings: 0, assets: 0, owedToYou: 0, youOwe: 0 }).haveShare).toBe(100);
    expect(biggestPart({ wallets: 0, savings: 0, assets: 0, owedToYou: 0, youOwe: 500 })).toBeNull();
  });
});

describe("insightPeriodFrom", () => {
  it("accepts the four periods and falls back to this month", () => {
    expect(insightPeriodFrom("this-year")).toBe("this-year");
    expect(insightPeriodFrom("all")).toBe("this-month");
    expect(insightPeriodFrom(undefined)).toBe("this-month");
  });
});
