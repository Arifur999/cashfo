import { describe, expect, it } from "vitest";
import { adminPeriodOf, busiest, isMonthly, isThisMonth, monthsSince, previousMonth, rangeQueryOf } from "./adminPeriod";

const TODAY = "2026-10-28";

describe("the admin report period", () => {
  it("is this month unless the address names another", () => {
    expect(adminPeriodOf({}, TODAY)).toEqual({ kind: "month", year: 2026, month: 10 });
    expect(adminPeriodOf({ month: "9", year: "2026" }, TODAY)).toEqual({ kind: "month", year: 2026, month: 9 });
    expect(adminPeriodOf({ period: "year", year: "2025" }, TODAY)).toEqual({ kind: "year", year: 2025 });
    expect(adminPeriodOf({ from: "2026-08-01", to: "2026-09-15" }, TODAY)).toEqual({ kind: "custom", from: "2026-08-01", to: "2026-09-15" });
    // An old ?range=30 link, or a broken one, opens this month.
    expect(adminPeriodOf({ range: "30" }, TODAY)).toEqual({ kind: "month", year: 2026, month: 10 });
    expect(adminPeriodOf({ from: "2026-09-15", to: "2026-08-01" }, TODAY)).toEqual({ kind: "month", year: 2026, month: 10 });
  });

  it("asks the reports for its days up to today", () => {
    expect(rangeQueryOf({ kind: "month", year: 2026, month: 10 }, TODAY)).toBe("from=2026-10-01&to=2026-10-28");
    expect(rangeQueryOf({ kind: "year", year: 2025 }, TODAY)).toBe("from=2025-01-01&to=2025-12-31");
    expect(rangeQueryOf({ kind: "month", year: 2026, month: 12 }, TODAY)).toBe("from=2026-10-28&to=2026-10-28");
  });

  it("draws a year or more than 62 days month by month", () => {
    expect(isMonthly({ kind: "year", year: 2026 }, TODAY)).toBe(true);
    expect(isMonthly({ kind: "month", year: 2026, month: 10 }, TODAY)).toBe(false);
    expect(isMonthly({ kind: "custom", from: "2026-08-28", to: "2026-10-28" }, TODAY)).toBe(false);
    expect(isMonthly({ kind: "custom", from: "2026-08-27", to: "2026-10-28" }, TODAY)).toBe(true);
  });

  it("offers the months from the first customer's on", () => {
    expect(monthsSince("2025-11-20", "2026-02-03")?.map((m) => `${m.year}-${m.month}`)).toEqual(["2025-11", "2025-12", "2026-1", "2026-2"]);
    expect(monthsSince(null, TODAY)).toBeNull();
  });

  it("knows this month, the month before and the busiest bar", () => {
    expect(isThisMonth({ kind: "month", year: 2026, month: 10 }, TODAY)).toBe(true);
    expect(isThisMonth({ kind: "month", year: 2025, month: 10 }, TODAY)).toBe(false);
    expect(previousMonth("2026-01")).toBe("2025-12");
    expect(busiest([{ key: "a", count: 2 }, { key: "b", count: 5 }, { key: "c", count: 5 }])?.key).toBe("b");
    expect(busiest([{ key: "a", count: 0 }])).toBeNull();
  });
});
