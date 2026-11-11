import { describe, expect, it } from "vitest";
import { budgetHref, budgetState, categoryName, daysLeft, donutGradient, firstFreeMonth, oneDecimal, percentOf, planMatches, planMonthToShow, readMonth, savingsRate, transactionsHref } from "./ieFigures";

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

describe("planMonthToShow", () => {
  const plans = [
    { month: 11, year: 2026, id: "a" },
    { month: 10, year: 2026, id: "b" },
    { month: 8, year: 2026, id: "c" },
  ];

  it("shows the month asked for when it has a plan", () => {
    expect(planMonthToShow(plans, { month: 8, year: 2026 }, NOW, true)).toEqual({ shown: { month: 8, year: 2026 }, missing: null });
  });

  it("falls back to this month's plan, and names a month the address asked for", () => {
    expect(planMonthToShow(plans, { month: 9, year: 2026 }, NOW, true)).toEqual({ shown: { month: 10, year: 2026 }, missing: { month: 9, year: 2026 } });
  });

  it("falls back to the newest plan without a word when nothing was named", () => {
    expect(planMonthToShow(plans.filter((plan) => plan.month !== 10), NOW, NOW, false)).toEqual({ shown: { month: 11, year: 2026 }, missing: null });
  });

  it("shows nothing when no month has a plan", () => {
    expect(planMonthToShow([], { month: 9, year: 2026 }, NOW, true)).toEqual({ shown: null, missing: null });
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

  it("counts the days left after today", () => {
    expect(daysLeft(2026, 10, "2026-10-28")).toBe(3);
    expect(daysLeft(2026, 10, "2026-10-31")).toBe(0);
    expect(daysLeft(2026, 9, "2026-10-29")).toBe(0);
    expect(daysLeft(2026, 11, "2026-10-29")).toBe(30);
  });
});

describe("firstFreeMonth", () => {
  it("is this month when it has no plan, else the next free one, across a new year", () => {
    expect(firstFreeMonth([], NOW)).toEqual(NOW);
    expect(firstFreeMonth([{ month: 10, year: 2026 }, { month: 11, year: 2026 }, { month: 12, year: 2026 }], NOW)).toEqual({ month: 1, year: 2027 });
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

describe("the Overview's ways into Transactions and Budget Planning", () => {
  it("opens a kind, a category or the money with none, in the period", () => {
    expect(transactionsHref({ kind: "month", month: 10, year: 2026 }, NOW, { type: "INCOME" })).toBe("/transactions?type=INCOME");
    expect(transactionsHref({ kind: "month", month: 9, year: 2026 }, NOW, { type: "EXPENSE", categoryId: "Food & Dining" })).toBe("/transactions?type=EXPENSE&categoryId=Food+%26+Dining&month=9&year=2026");
    expect(transactionsHref({ kind: "year", year: 2025 }, NOW, { type: "EXPENSE", uncategorised: true })).toBe("/transactions?type=EXPENSE&uncategorised=1&period=year&year=2025");
    expect(transactionsHref({ kind: "custom", from: "2026-08-01", to: "2026-10-28" }, NOW)).toBe("/transactions?from=2026-08-01&to=2026-10-28");
  });

  it("plans the period's month, else this one", () => {
    expect(budgetHref({ kind: "month", month: 9, year: 2026 })).toBe("/categories?month=9&year=2026");
    expect(budgetHref({ kind: "year", year: 2025 })).toBe("/categories");
  });

  it("writes a share to one decimal and names the money with no category", () => {
    expect(oneDecimal(70.54)).toBe("70.5");
    expect(oneDecimal(4)).toBe("4");
    const t = (key: string) => `bn:${key}`;
    expect(categoryName({ name: "Uncategorised", uncategorised: true }, t)).toBe("bn:Uncategorised");
    expect(categoryName({ name: "Salary" }, t)).toBe("bn:Salary");
    expect(categoryName({ name: "My own pot" }, t)).toBe("My own pot");
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
