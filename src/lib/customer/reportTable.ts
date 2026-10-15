import type { MonthlyBreakdown } from "./api";
import type { DateRangePreset } from "./dateRangePresets";

// The Reports table: income and expense categories month by month, with a
// total and a share each, then what was left over. Pure, so the CSV and
// the page draw the very same rows.

export const REPORT_PERIODS = ["this-month", "last-month", "last-3-months", "this-year", "last-year"] as const satisfies readonly DateRangePreset[];
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  "this-month": "This month",
  "last-month": "Last month",
  "last-3-months": "Last 3 months",
  "this-year": "This year",
  "last-year": "Last year",
};

export function reportPeriodFrom(value: unknown): ReportPeriod {
  return typeof value === "string" && (REPORT_PERIODS as readonly string[]).includes(value) ? (value as ReportPeriod) : "last-3-months";
}

export const REPORT_SHOWS = ["both", "income", "expense"] as const;
export type ReportShow = (typeof REPORT_SHOWS)[number];

export function reportShowFrom(value: unknown): ReportShow {
  return typeof value === "string" && (REPORT_SHOWS as readonly string[]).includes(value) ? (value as ReportShow) : "both";
}

export interface ReportRow {
  // A block heading (Money in / Money out), a category under it, or the
  // Left over line at the end.
  kind: "block" | "category" | "left";
  type: "INCOME" | "EXPENSE" | null;
  name: string;
  amounts: number[];
  total: number;
  // Of the block for a category, 100 for a block, of the income for Left
  // over; null when there is nothing to take a share of.
  share: number | null;
  // The category's colour name; blocks and Left over have none.
  color: string | null;
}

export const BLOCK_LABELS = { INCOME: "Money in", EXPENSE: "Money out", LEFT: "Left over" } as const;

const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);

function block(breakdown: MonthlyBreakdown, months: string[]): ReportRow[] {
  const total = Number(breakdown.total);
  const at = (amounts: string[]) => months.map((month) => Number(amounts[breakdown.months.indexOf(month)] ?? 0));
  return [
    { kind: "block", type: breakdown.type, name: BLOCK_LABELS[breakdown.type], amounts: at(breakdown.totals), total, share: total > 0 ? 100 : null, color: null },
    ...breakdown.rows.map((row) => ({ kind: "category" as const, type: breakdown.type, name: row.name, amounts: at(row.amounts), total: Number(row.total), share: share(Number(row.total), total), color: row.color })),
  ];
}

// Every row of the table for the months the two breakdowns cover, in
// order: Money in and its categories, Money out and its, Left over.
export function reportRows(income: MonthlyBreakdown, expense: MonthlyBreakdown, show: ReportShow = "both"): { months: string[]; rows: ReportRow[] } {
  const months = [...new Set([...income.months, ...expense.months])].sort();
  const moneyIn = block(income, months);
  const moneyOut = block(expense, months);
  const left: ReportRow = {
    kind: "left",
    type: null,
    name: BLOCK_LABELS.LEFT,
    amounts: months.map((_, i) => moneyIn[0].amounts[i] - moneyOut[0].amounts[i]),
    total: moneyIn[0].total - moneyOut[0].total,
    share: share(moneyIn[0].total - moneyOut[0].total, moneyIn[0].total),
    color: null,
  };
  const rows = show === "income" ? moneyIn : show === "expense" ? moneyOut : [...moneyIn, ...moneyOut, left];
  return { months, rows };
}

const cell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

// The same table as text, one line per row, for a spreadsheet.
export function reportCsv(months: string[], rows: ReportRow[], labels: { category: string; total: string; share: string; months: string[]; names: (row: ReportRow) => string }): string {
  const header = [labels.category, ...labels.months, labels.total, labels.share];
  const lines = rows.map((row) => [labels.names(row), ...row.amounts.map((a) => a.toFixed(2)), row.total.toFixed(2), row.share === null ? "" : `${row.share}%`]);
  return [header, ...lines].map((line) => line.map(cell).join(",")).join("\n");
}
