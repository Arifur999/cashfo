import { describe, expect, it } from "vitest";
import { bnDictionary } from "@/lib/i18n/dictionary";
import type { MonthlyBreakdown } from "./api";
import { incomeYear, incomeYearSpan, REPORT_PERIOD_LABELS, REPORT_PERIODS, reportCsv, reportFileName, reportHref, reportPeriodFrom, reportRange, reportRows, reportShowFrom } from "./reportTable";

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

  it("keeps a name that looks like a formula as text, but not the figures", () => {
    const risky = breakdown("EXPENSE", [["=Misc", [100, 0]], ["+Bonus", [0, 50]], ["@home", [10, 10]]]);
    const { months: keys, rows } = reportRows(income, risky);
    const csv = reportCsv(keys, rows, { category: "Category", total: "Total", share: "Share", months: ["Aug", "Sep"], names: (row) => row.name });
    const lines = csv.split("\n");
    expect(lines).toContain("'=Misc,100.00,0.00,100.00,59%");
    expect(lines).toContain("'+Bonus,0.00,50.00,50.00,29%");
    expect(lines).toContain("'@home,10.00,10.00,20.00,12%");
    // A negative Left over stays a number.
    const { rows: overspent } = reportRows(breakdown("INCOME", [["Salary", [10, 10]]]), breakdown("EXPENSE", [["Rent", [30, 10]]]));
    expect(reportCsv(keys, overspent, { category: "Category", total: "Total", share: "Share", months: ["Aug", "Sep"], names: (row) => row.name }).split("\n").at(-1)).toBe("Left over,-20.00,0.00,-20.00,-100%");
  });
});

describe("reportFileName", () => {
  it("names the days and the wallet, keeping Bangla letters whole", () => {
    expect(reportFileName({ dateFrom: "2026-08-01", dateTo: "2026-10-21" })).toBe("smartly-report-2026-08-01_2026-10-21.csv");
    expect(reportFileName({ dateFrom: "2026-08-01", dateTo: "2026-10-21" }, "City Bank (Savings)")).toBe("smartly-report-2026-08-01_2026-10-21-city-bank-savings.csv");
    expect(reportFileName({ dateFrom: "2026-08-01", dateTo: "2026-10-21" }, "নগদ টাকা")).toBe("smartly-report-2026-08-01_2026-10-21-নগদ-টাকা.csv");
  });
});

describe("periods", () => {
  it("knows Bangladesh's income year, July to June", () => {
    expect(incomeYear("2026-10-21")).toEqual({ dateFrom: "2026-07-01", dateTo: "2027-06-30" });
    expect(incomeYear("2026-10-21", -1)).toEqual({ dateFrom: "2025-07-01", dateTo: "2026-06-30" });
    expect(incomeYear("2026-03-01")).toEqual({ dateFrom: "2025-07-01", dateTo: "2026-06-30" });
    expect(incomeYear("2026-07-01")).toEqual({ dateFrom: "2026-07-01", dateTo: "2027-06-30" });
  });

  it("names an income year as the return does", () => {
    expect(incomeYearSpan(incomeYear("2026-10-21", -1))).toBe("2025–26");
    expect(incomeYearSpan(incomeYear("2099-10-21"))).toBe("2099–00");
  });

  // The July–June year is the income year (আয়বর্ষ); its tax year is the next.
  it("names every period, in Bangla too", () => {
    expect(REPORT_PERIOD_LABELS["last-tax-year"]).toBe("Last income year ({span})");
    for (const label of Object.values(REPORT_PERIOD_LABELS)) expect(bnDictionary[label], label).toBeTruthy();
    expect(bnDictionary["Last income year ({span})"]).toBe("গত আয়বর্ষ ({span})");
  });

  it("resolves every period from today", () => {
    const today = "2026-10-21";
    expect(Object.fromEntries(REPORT_PERIODS.map((period) => [period, reportRange(period, today)]))).toEqual({
      "this-month": { dateFrom: "2026-10-01", dateTo: "2026-10-21" },
      "last-month": { dateFrom: "2026-09-01", dateTo: "2026-09-30" },
      "last-3-months": { dateFrom: "2026-08-01", dateTo: "2026-10-21" },
      "this-year": { dateFrom: "2026-01-01", dateTo: "2026-10-21" },
      "last-year": { dateFrom: "2025-01-01", dateTo: "2025-12-31" },
      "this-tax-year": { dateFrom: "2026-07-01", dateTo: "2026-10-21" },
      "last-tax-year": { dateFrom: "2025-07-01", dateTo: "2026-06-30" },
    });
    expect(reportRange("last-month", "2026-01-15")).toEqual({ dateFrom: "2025-12-01", dateTo: "2025-12-31" });
    expect(reportRange("last-3-months", "2026-02-10")).toEqual({ dateFrom: "2025-12-01", dateTo: "2026-02-10" });
  });
});

describe("URL values", () => {
  it("falls back to the last 3 months and both sides", () => {
    expect(reportPeriodFrom("this-year")).toBe("this-year");
    expect(reportPeriodFrom("last-tax-year")).toBe("last-tax-year");
    expect(reportPeriodFrom("custom")).toBe("last-3-months");
    expect(reportShowFrom("income")).toBe("income");
    expect(reportShowFrom("x")).toBe("both");
  });

  it("writes a view back as a URL, leaving the defaults out", () => {
    expect(reportHref({ period: "this-year", walletId: null, show: "both" })).toBe("/reports/detailed?period=this-year");
    expect(reportHref({ period: "this-tax-year", walletId: "w1", show: "expense" })).toBe("/reports/detailed?period=this-tax-year&wallet=w1&show=expense");
  });
});
