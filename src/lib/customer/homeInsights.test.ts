import { describe, expect, it } from "vitest";
import type { CategoryBreakdown, LoanDashboardRow, MonthlyBreakdown, SavingsGoal } from "./api";
import {
  balanceAsOfTotal,
  balanceChangePercent,
  bestMonthNote,
  categoryDelta,
  chartAxis,
  daysLeftInMonth,
  isFirstMonthOnRecord,
  loanCounts,
  monthColumn,
  previousMonthEnd,
  sameDaysLastMonth,
  savingsRate,
  savingsTotals,
  topShare,
  windowStart,
} from "./homeInsights";

const breakdown = (type: "INCOME" | "EXPENSE", rows: [string, number][]): CategoryBreakdown => ({
  type,
  total: rows.reduce((sum, [, amount]) => sum + amount, 0).toFixed(2),
  categories: rows.map(([name, amount]) => ({ name, amount: amount.toFixed(2), percent: 0, color: "green" })),
});

describe("balanceChangePercent", () => {
  it("compares the wallets now with what they held on the 1st", () => {
    expect(balanceChangePercent(66750, 57950)).toBe(15.2);
    expect(balanceChangePercent(45000, 50000)).toBe(-10);
  });

  it("counts every way money left, not only expenses", () => {
    // 50,000 on the 1st; +10,000 income, −2,000 expense and 20,000 into a
    // savings goal leave 38,000: the balance fell, whatever the month's
    // income and expense say.
    expect(balanceChangePercent(38000, 50000)).toBe(-24);
  });

  it("has nothing to compare with when the month started at zero or is unknown", () => {
    expect(balanceChangePercent(8800, 0)).toBeNull();
    expect(balanceChangePercent(100, -50)).toBeNull();
    expect(balanceChangePercent(100, null)).toBeNull();
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

describe("monthColumn", () => {
  const monthly: MonthlyBreakdown = {
    type: "EXPENSE",
    months: ["2026-09", "2026-10"],
    rows: [
      { name: "Food", color: "orange", amounts: ["18200.00", "16800.00"], total: "35000.00" },
      { name: "Rent", color: "blue", amounts: ["15000.00", "0.00"], total: "15000.00" },
    ],
    totals: ["33200.00", "16800.00"],
    total: "50000.00",
  };

  it("reads one month as a category breakdown, leaving out the empty categories", () => {
    expect(monthColumn(monthly, 1)).toEqual({ type: "EXPENSE", total: "16800.00", categories: [{ name: "Food", amount: "16800.00", percent: 100, color: "orange" }] });
    expect(topShare(monthColumn(monthly, 0))).toEqual({ name: "Food", amount: 18200, percent: 55 });
  });

  it("reads a month it doesn't have as empty", () => {
    expect(monthColumn(monthly, 5)).toEqual({ type: "EXPENSE", total: "0.00", categories: [] });
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
      profitPaid: "0",
      profitReceived: "0",
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

describe("savingsTotals", () => {
  const goal = (currentAmount: number, targetAmount: number, status: SavingsGoal["status"] = "ACTIVE") => ({ status, currentAmount: currentAmount.toFixed(2), targetAmount: targetAmount.toFixed(2) });

  it("adds up every goal, as Savings › Goals does", () => {
    expect(savingsTotals([goal(55000, 100000), goal(0, 50000)])).toEqual({ saved: 55000, target: 150000, progress: 37, count: 2 });
  });

  it("leaves out a withdrawn goal, its target and all", () => {
    expect(savingsTotals([goal(20000, 150000), goal(0, 80000, "WITHDRAWN")])).toEqual({ saved: 20000, target: 150000, progress: 13, count: 1 });
  });

  it("never passes 100%, and is 0% with no target", () => {
    expect(savingsTotals([goal(120000, 100000)]).progress).toBe(100);
    expect(savingsTotals([])).toEqual({ saved: 0, target: 0, progress: 0, count: 0 });
  });
});

describe("balanceAsOfTotal", () => {
  it("adds up each wallet's balance at the day's close", () => {
    expect(balanceAsOfTotal([{ balanceAsOf: "1000.50" }, { balanceAsOf: "-200.00" }, { balanceAsOf: "0.00" }])).toBe(800.5);
  });

  it("is null with no wallets, or when a wallet has no balanceAsOf (an older backend)", () => {
    expect(balanceAsOfTotal([])).toBeNull();
    expect(balanceAsOfTotal([{ balanceAsOf: "100.00" }, {}])).toBeNull();
    expect(balanceAsOfTotal([{ balanceAsOf: null }])).toBeNull();
  });
});

describe("chartAxis", () => {
  it("has no axis when there is nothing to plot", () => {
    expect(chartAxis(0)).toBeNull();
    expect(chartAxis(-500)).toBeNull();
    expect(chartAxis(Number.NaN)).toBeNull();
  });

  it("never labels the top and the middle with the same figure", () => {
    expect(chartAxis(0.4)).toEqual({ max: 2, mid: 1 });
    expect(chartAxis(1)).toEqual({ max: 2, mid: 1 });
    expect(chartAxis(3)).toEqual({ max: 10, mid: 5 });
  });

  it("rounds the top up to a clean figure", () => {
    expect(chartAxis(85000)).toEqual({ max: 100000, mid: 50000 });
    expect(chartAxis(320000)).toEqual({ max: 500000, mid: 250000 });
    expect(chartAxis(150000)).toEqual({ max: 200000, mid: 100000 });
    expect(chartAxis(100000)).toEqual({ max: 100000, mid: 50000 });
  });
});

describe("previousMonthEnd", () => {
  it("is the last day of the month before", () => {
    expect(previousMonthEnd("2026-10-21")).toBe("2026-09-30");
    expect(previousMonthEnd("2026-01-01")).toBe("2025-12-31");
    expect(previousMonthEnd("2028-03-15")).toBe("2028-02-29");
  });
});

describe("bestMonthNote", () => {
  const point = (month: string, kept: number) => ({ month, kept });

  it("says when this month is the best of the run", () => {
    expect(bestMonthNote([point("2026-07", 33000), point("2026-08", 26000), point("2026-10", 35000)])).toEqual({ best: true });
  });

  it("names the latest month that kept more", () => {
    expect(bestMonthNote([point("2026-07", 33000), point("2026-08", 26000), point("2026-10", 32700)])).toEqual({ best: false, beatenBy: "2026-07" });
  });

  it("says nothing of a month that kept nothing, or with no months before it", () => {
    expect(bestMonthNote([point("2026-09", 1000), point("2026-10", -500)])).toBeNull();
    expect(bestMonthNote([point("2026-10", 1)])).toBeNull();
  });
});

describe("daysLeftInMonth", () => {
  it("counts today", () => {
    expect(daysLeftInMonth("2026-10-02")).toBe(30);
    expect(daysLeftInMonth("2026-02-28")).toBe(1);
    expect(daysLeftInMonth("2028-02-01")).toBe(29);
  });
});

describe("windowStart", () => {
  it("is the 1st of the month count − 1 months back", () => {
    expect(windowStart("2026-10-21", 6)).toBe("2026-05-01");
    expect(windowStart("2026-02-10", 6)).toBe("2025-09-01");
    expect(windowStart("2026-10-21", 1)).toBe("2026-10-01");
  });
});

describe("sameDaysLastMonth", () => {
  it("runs from last month's 1st to the same day", () => {
    expect(sameDaysLastMonth("2026-10-05")).toEqual({ dateFrom: "2026-09-01", dateTo: "2026-09-05" });
    expect(sameDaysLastMonth("2026-01-15")).toEqual({ dateFrom: "2025-12-01", dateTo: "2025-12-15" });
  });

  it("stops at the end of a shorter month", () => {
    expect(sameDaysLastMonth("2026-03-31")).toEqual({ dateFrom: "2026-02-01", dateTo: "2026-02-28" });
    expect(sameDaysLastMonth("2028-03-30")).toEqual({ dateFrom: "2028-02-01", dateTo: "2028-02-29" });
  });
});

describe("isFirstMonthOnRecord", () => {
  const quiet = [{ income: 0, expense: 0 }];

  it("is true only when nothing at all came before this month", () => {
    expect(isFirstMonthOnRecord({ earlier: quiet, recentDays: ["2026-10-04", "2026-10-02"], total: 2, monthStart: "2026-10-01" })).toBe(true);
  });

  it("is false once an earlier month had money in or out", () => {
    expect(isFirstMonthOnRecord({ earlier: [{ income: 0, expense: 300 }], recentDays: ["2026-10-04"], total: 1, monthStart: "2026-10-01" })).toBe(false);
  });

  it("is false when a transaction is older, or there may be older ones unseen", () => {
    expect(isFirstMonthOnRecord({ earlier: quiet, recentDays: ["2026-10-04", "2026-09-28"], total: 2, monthStart: "2026-10-01" })).toBe(false);
    expect(isFirstMonthOnRecord({ earlier: quiet, recentDays: ["2026-10-04"], total: 9, monthStart: "2026-10-01" })).toBe(false);
  });
});
