import { describe, expect, it } from "vitest";
import type { MonthlyBreakdown } from "./api";
import { reportCsv, reportPeriodFrom, reportRows, reportShowFrom } from "./reportTable";

const months = ["2026-08", "2026-09"];
const breakdown = (type: "INCOME" | "EXPENSE", rows: [string, number[]][]): MonthlyBreakdown => {
  const totals = months.map((_, i) => rows.reduce((sum, [, amounts]) => sum + amounts[i], 0));
  return {
    type,
    months,
    rows: rows.map(([name, amounts]) => ({ name, color: "green", amounts: amounts.map((a) => a.toFixed(2)), total: amounts.reduce((a, b) => a + b, 0).toFixed(2) })),
    totals: totals.map((t) => t.toFixed(2)),
    total: totals.reduce((a, b) => a + b, 0).toFixed(2),
  };
};

const income = breakdown("INCOME", [["Salary", [66000, 66000]], ["Freelance", [10000, 9000]]]);
const expense = breakdown("EXPENSE", [["Food, Dining", [17200, 18200]], ["Rent", [15000, 15000]]]);

describe("reportRows", () => {
  it("lists money in, money out and what was left, with shares", () => {
    const { rows } = reportRows(income, expense);
    expect(rows.map((r) => [r.kind, r.name, r.total, r.share])).toEqual([
      ["block", "Money in", 151000, 100],
      ["category", "Salary", 132000, 87],
      ["category", "Freelance", 19000, 13],
      ["block", "Money out", 65400, 100],
      ["category", "Food, Dining", 35400, 54],
      ["category", "Rent", 30000, 46],
      ["left", "Left over", 85600, 57],
    ]);
    expect(rows[6].amounts).toEqual([43800, 41800]);
  });

  it("shows one side alone when asked, and copes with empty months", () => {
    expect(reportRows(income, expense, "expense").rows.map((r) => r.name)).toEqual(["Money out", "Food, Dining", "Rent"]);
    const empty: MonthlyBreakdown = { type: "EXPENSE", months: [], rows: [], totals: [], total: "0.00" };
    const { rows } = reportRows(income, empty);
    expect(rows[3]).toMatchObject({ name: "Money out", amounts: [0, 0], total: 0, share: null });
  });
});

describe("reportCsv", () => {
  it("writes one line per row and quotes names with commas", () => {
    const { months: keys, rows } = reportRows(income, expense, "expense");
    const csv = reportCsv(keys, rows, { category: "Category", total: "Total", share: "Share", months: ["Aug", "Sep"], names: (row) => row.name });
    expect(csv.split("\n")).toEqual(["Category,Aug,Sep,Total,Share", "Money out,32200.00,33200.00,65400.00,100%", '"Food, Dining",17200.00,18200.00,35400.00,54%', "Rent,15000.00,15000.00,30000.00,46%"]);
  });
});

describe("URL values", () => {
  it("falls back to the last 3 months and both sides", () => {
    expect(reportPeriodFrom("this-year")).toBe("this-year");
    expect(reportPeriodFrom("custom")).toBe("last-3-months");
    expect(reportShowFrom("income")).toBe("income");
    expect(reportShowFrom("x")).toBe("both");
  });
});
