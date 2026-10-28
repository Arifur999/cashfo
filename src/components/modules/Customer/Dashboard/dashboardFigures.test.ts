import { describe, expect, it } from "vitest";
import { categoryChartColor, changePercent, donutGradient, isDay, quarterAxis, readDashboardPeriod, spendingSlices } from "./dashboardFigures";

describe("readDashboardPeriod", () => {
  it("reads this month so far against the same days of last month", () => {
    expect(readDashboardPeriod({}, "2026-10-21")).toEqual({ key: "this-month", dateFrom: "2026-10-01", dateTo: "2026-10-21", compare: { dateFrom: "2026-09-01", dateTo: "2026-09-21" } });
    // 31 March against the whole of a shorter February.
    expect(readDashboardPeriod({ period: "this-month" }, "2026-03-31").compare).toEqual({ dateFrom: "2026-02-01", dateTo: "2026-02-28" });
    // January against last December.
    expect(readDashboardPeriod({}, "2027-01-05").compare).toEqual({ dateFrom: "2026-12-01", dateTo: "2026-12-05" });
  });

  it("reads last month whole, against the month before", () => {
    expect(readDashboardPeriod({ period: "last-month" }, "2026-01-10")).toEqual({ key: "last-month", dateFrom: "2025-12-01", dateTo: "2025-12-31", compare: { dateFrom: "2025-11-01", dateTo: "2025-11-30" } });
    expect(readDashboardPeriod({ period: "last-month" }, "2026-02-10").compare).toEqual({ dateFrom: "2025-12-01", dateTo: "2025-12-31" });
  });

  it("reads this year so far against the same days of last year", () => {
    expect(readDashboardPeriod({ period: "this-year" }, "2028-02-29")).toEqual({ key: "this-year", dateFrom: "2028-01-01", dateTo: "2028-02-29", compare: { dateFrom: "2027-01-01", dateTo: "2027-02-28" } });
  });

  it("reads a custom stretch against the as-long stretch before it", () => {
    expect(readDashboardPeriod({ period: "custom", from: "2026-10-01", to: "2026-10-10" }, "2026-10-21")).toEqual({
      key: "custom",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-10",
      compare: { dateFrom: "2026-09-21", dateTo: "2026-09-30" },
    });
  });

  it("falls back to this month for anything it can't read", () => {
    expect(readDashboardPeriod({ period: "custom", from: "2026-10-10", to: "2026-10-01" }, "2026-10-21").key).toBe("this-month");
    expect(readDashboardPeriod({ period: "custom", from: "2026-02-30", to: "2026-03-01" }, "2026-10-21").key).toBe("this-month");
    expect(readDashboardPeriod({ period: "forever" }, "2026-10-21").key).toBe("this-month");
  });
});

describe("isDay", () => {
  it("takes only real days", () => {
    expect(isDay("2026-02-28")).toBe(true);
    expect(isDay("2026-02-29")).toBe(false);
    expect(isDay("0002-01-01")).toBe(false);
    expect(isDay(undefined)).toBe(false);
  });
});

describe("changePercent", () => {
  it("is the move to one decimal, or null with nothing before", () => {
    expect(changePercent(85000, 80000)).toBe(6.3);
    expect(changePercent(52300, 54500)).toBe(-4);
    expect(changePercent(100, 0)).toBeNull();
  });
});

describe("spendingSlices", () => {
  const breakdown = (amounts: number[]) => ({
    type: "EXPENSE" as const,
    total: String(amounts.reduce((a, b) => a + b, 0)),
    categories: amounts.map((amount, i) => ({ name: `C${i}`, amount: String(amount), percent: 0, color: "orange" })),
  });

  it("orders the categories by amount", () => {
    expect(spendingSlices(breakdown([100, 300])).map((s) => [s.name, s.percent])).toEqual([
      ["C1", 75],
      ["C0", 25],
    ]);
  });

  it("puts the rest together as Other past the limit", () => {
    const slices = spendingSlices(breakdown([60, 50, 40, 30, 20, 10, 5]), 6);
    expect(slices).toHaveLength(6);
    expect(slices[5]).toEqual({ name: "Other", amount: 15, percent: 7, color: null });
  });

  it("is empty with nothing spent", () => {
    expect(spendingSlices(breakdown([]))).toEqual([]);
  });
});

describe("donut colours", () => {
  it("maps colour names onto the theme's category tokens", () => {
    expect(categoryChartColor("orange")).toBe("var(--cat-2)");
    expect(categoryChartColor(null)).toBe("var(--ink-faint)");
    expect(donutGradient([{ name: "A", amount: 1, percent: 50, color: "blue" }, { name: "B", amount: 1, percent: 50, color: null }])).toBe(
      "conic-gradient(var(--cat-4) 0.00% 50.00%, var(--ink-faint) 50.00% 100.00%)",
    );
  });
});

describe("quarterAxis", () => {
  it("rounds the top up to a clean figure, a rule every quarter", () => {
    expect(quarterAxis(85000)).toEqual([100000, 75000, 50000, 25000, 0]);
    expect(quarterAxis(130000)).toEqual([200000, 150000, 100000, 50000, 0]);
    expect(quarterAxis(0)).toBeNull();
  });
});
