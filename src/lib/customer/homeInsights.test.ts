import { describe, expect, it } from "vitest";
import type { CategoryBreakdown, LoanDashboardRow } from "./api";
import { balanceChangePercent, bestMonthNote, categoryDelta, daysLeftInMonth, loanCounts, savingsRate, topShare } from "./homeInsights";

const breakdown = (type: "INCOME" | "EXPENSE", rows: [string, number][]): CategoryBreakdown => ({
  type,
  total: rows.reduce((sum, [, amount]) => sum + amount, 0).toFixed(2),
  categories: rows.map(([name, amount]) => ({ name, amount: amount.toFixed(2), percent: 0, color: "green" })),
});

describe("balanceChangePercent", () => {
  it("compares the month's net flow with the starting balance", () => {
    expect(balanceChangePercent(66750, 8800)).toBe(15.2);
    expect(balanceChangePercent(50000, -5000)).toBe(-9.1);
  });

  it("has nothing to compare with when the month started at zero", () => {
    expect(balanceChangePercent(8800, 8800)).toBeNull();
    expect(balanceChangePercent(0, 0)).toBeNull();
  });
});

describe("topShare", () => {
  it("names the biggest category and its share", () => {
    expect(topShare(breakdown("INCOME", [["Salary", 80000], ["Freelance", 20000]]))).toEqual({ name: "Salary", amount: 80000, percent: 80 });
  });

  it("is null without any amount", () => {
    expect(topShare(breakdown("EXPENSE", []))).toBeNull();
  });
});

describe("categoryDelta", () => {
  it("is the change against the previous period", () => {
    const now = breakdown("EXPENSE", [["Food", 16800]]);
    const before = breakdown("EXPENSE", [["Food", 18200]]);
    expect(categoryDelta(now, before, "Food")).toBe(-1400);
    expect(categoryDelta(now, breakdown("EXPENSE", []), "Food")).toBe(16800);
  });
});

describe("loanCounts", () => {
  it("counts people by direction", () => {
    const row = (direction: LoanDashboardRow["direction"]): LoanDashboardRow => ({
      contactId: direction,
      contactName: direction,
      contactPhone: null,
      openingBalance: "0",
      totalReceive: "0",
      totalPayment: "0",
      currentBalance: "0",
      direction,
    });
    expect(loanCounts([row("PAWNA"), row("PAWNA"), row("DENA"), row("SETTLED")])).toEqual({ oweYou: 2, youOwe: 1 });
  });
});

describe("savingsRate", () => {
  it("is the share of income kept, never below zero", () => {
    expect(savingsRate(85000, 52300)).toBe(38);
    expect(savingsRate(1000, 1500)).toBe(0);
    expect(savingsRate(0, 10)).toBeNull();
  });
});

describe("bestMonthNote", () => {
  const point = (month: string, savings: number) => ({ month, income: "0", savings: String(savings) });

  it("says when this month is the best of the run", () => {
    expect(bestMonthNote([point("Jul", 33000), point("Aug", 26000), point("Oct", 35000)])).toEqual({ best: true });
  });

  it("names the latest month that beat it", () => {
    expect(bestMonthNote([point("Jul", 33000), point("Aug", 26000), point("Oct", 32700)])).toEqual({ best: false, beatenBy: "Jul" });
  });

  it("needs at least two months", () => {
    expect(bestMonthNote([point("Oct", 1)])).toBeNull();
  });
});

describe("daysLeftInMonth", () => {
  it("counts today", () => {
    expect(daysLeftInMonth("2026-10-02")).toBe(30);
    expect(daysLeftInMonth("2026-02-28")).toBe(1);
    expect(daysLeftInMonth("2028-02-01")).toBe(29);
  });
});
