import { describe, expect, it } from "vitest";
import { budgetReference, budgetTabHref, fastestGrowing, hrefWithout, incomeShares, monthBounds, outsideCategories, readBudgetMonth, sourceHistory, sourceHistoryRange } from "./budgetFigures";

describe("hrefWithout", () => {
  it("drops the keys and keeps the rest, repeats too", () => {
    expect(hrefWithout("/categories", { month: "13", year: "2026", addType: "EXPENSE", tag: ["a", "b"] }, ["month", "year"])).toBe("/categories?addType=EXPENSE&tag=a&tag=b");
    expect(hrefWithout("/categories", { month: "13" }, ["month", "year"])).toBe("/categories");
  });
});

describe("readBudgetMonth", () => {
  it("takes a month the budget API can read", () => {
    expect(readBudgetMonth("10", "2026")).toEqual({ month: 10, year: 2026 });
    expect(readBudgetMonth("1", "2000")).toEqual({ month: 1, year: 2000 });
  });

  it("refuses anything else", () => {
    for (const [month, year] of [["13", "2026"], ["0", "2026"], ["10", "1999"], ["10", "2101"], ["abc", "2026"], ["2.5", "2026"], [undefined, "2026"], ["10", ["2026"]]]) {
      expect(readBudgetMonth(month, year), `${month}/${year}`).toBeNull();
    }
  });
});

describe("monthBounds", () => {
  it("runs from the first to the last day", () => {
    expect(monthBounds(2026, 2)).toEqual({ dateFrom: "2026-02-01", dateTo: "2026-02-28" });
    expect(monthBounds(2024, 2).dateTo).toBe("2024-02-29");
    expect(monthBounds(2026, 12)).toEqual({ dateFrom: "2026-12-01", dateTo: "2026-12-31" });
  });
});

describe("outsideCategories", () => {
  it("is what the month moved beyond its categories", () => {
    expect(outsideCategories(12500.5, 10000.25)).toBe(2500.25);
    expect(outsideCategories(100, 100)).toBe(0);
  });

  it("is nothing without the month's total, and never below nothing", () => {
    expect(outsideCategories(null, 500)).toBe(0);
    expect(outsideCategories(400, 500)).toBe(0);
  });
});

describe("budgetReference", () => {
  it("measures against the budget, else what the categories were given", () => {
    expect(budgetReference(30000, 25000)).toEqual({ amount: 30000, kind: "budget" });
    expect(budgetReference(null, 25000)).toEqual({ amount: 25000, kind: "categories" });
    expect(budgetReference(null, 0)).toBeNull();
  });
});

describe("sourceHistoryRange", () => {
  const today = { year: 2026, month: 10 };

  it("reaches back to the month before and on to today in this year", () => {
    expect(sourceHistoryRange(2026, 10, today)).toEqual({ dateFrom: "2026-01-01", dateTo: "2026-10-31" });
    expect(sourceHistoryRange(2026, 6, today)).toEqual({ dateFrom: "2026-01-01", dateTo: "2026-10-31" });
    expect(sourceHistoryRange(2026, 1, today)).toEqual({ dateFrom: "2025-12-01", dateTo: "2026-10-31" });
  });

  it("covers a finished year whole", () => {
    expect(sourceHistoryRange(2025, 3, today)).toEqual({ dateFrom: "2025-01-01", dateTo: "2025-12-31" });
  });
});

describe("sourceHistory", () => {
  const breakdown = {
    type: "INCOME" as const,
    months: ["2025-12", "2026-01", "2026-02"],
    rows: [
      { name: "Salary", color: "green", amounts: ["80000.00", "85000.00", "85000.00"], total: "250000.00" },
      { name: "Freelance", color: "blue", amounts: ["0.00", "12000.00", "0.00"], total: "12000.00" },
    ],
    totals: [],
    total: "262000.00",
  };

  it("takes the month before from its column and the year from its months", () => {
    expect(sourceHistory(breakdown, 2026, 1)).toEqual({ lastMonth: { Salary: 80000 }, thisYear: { Salary: 170000, Freelance: 12000 } });
    expect(sourceHistory(breakdown, 2026, 2).lastMonth).toEqual({ Salary: 85000, Freelance: 12000 });
  });

  it("knows nothing of a month it wasn't given", () => {
    expect(sourceHistory(breakdown, 2027, 6).lastMonth).toEqual({});
  });
});

describe("fastestGrowing", () => {
  it("picks the biggest rise since last month", () => {
    const growth = fastestGrowing(
      [
        { name: "Salary", amount: 90000 },
        { name: "Freelance", amount: 15000 },
      ],
      { Salary: 85000, Freelance: 10000 },
    );
    expect(growth).toEqual({ name: "Freelance", before: 10000, now: 15000, percent: 50 });
  });

  it("is null when nothing grew, or there is nothing to grow from", () => {
    expect(fastestGrowing([{ name: "Salary", amount: 80000 }], { Salary: 85000 })).toBeNull();
    expect(fastestGrowing([{ name: "Salary", amount: 80000 }], {})).toBeNull();
  });
});

describe("budgetTabHref", () => {
  it("keeps the month and stays on Budget planning's address", () => {
    expect(budgetTabHref("expense", "/categories", 10, 2026)).toBe("/categories?month=10&year=2026");
    expect(budgetTabHref("income", "/categories", 10, 2026)).toBe("/categories?tab=income&month=10&year=2026");
  });

  it("keeps the Income Category address for its own tab", () => {
    expect(budgetTabHref("income", "/income-category", 9, 2026)).toBe("/income-category?month=9&year=2026");
    expect(budgetTabHref("expense", "/income-category", 9, 2026)).toBe("/categories?month=9&year=2026");
  });
});

describe("incomeShares", () => {
  const category = (id: string, spent: string) => ({ id, name: id, color: "green", spent });

  it("is each category's earnings over the month's total, without the ones that earned nothing", () => {
    const shares = incomeShares([category("salary", "85000"), category("freelance", "12000"), category("bonus", "0")], 100000);
    expect(shares.map((s) => [s.id, s.share])).toEqual([
      ["salary", 85],
      ["freelance", 12],
    ]);
  });

  it("is empty when nothing came in", () => {
    expect(incomeShares([category("salary", "0")], 0)).toEqual([]);
  });
});
