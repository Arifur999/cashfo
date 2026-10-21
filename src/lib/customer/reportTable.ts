import type { MonthlyBreakdown } from "./api";
import type { DayRange } from "./insights";

// The Reports table: income and expense categories month by month, with a
// total and a share each, then what was left over. Pure, so the CSV and
// the page draw the very same rows.

// The calendar periods (as resolveDateRange() has them) and Bangladesh's
// income years, 1 July to 30 June, for the tax file. The URL values still
// say "tax-year", so old links keep working.
export const REPORT_PERIODS = ["this-month", "last-month", "last-3-months", "this-year", "last-year", "this-tax-year", "last-tax-year"] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

// The income years name their span: "This income year (Jul 2026–Jun 2027)".
// Income year (আয়বর্ষ), as the Income Tax Act 2023 and the return say, not
// tax year (করবর্ষ), which is the year after: July 2025 to June 2026 is
// income year 2025–26, assessed in tax year 2026–27.
export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  "this-month": "This month",
  "last-month": "Last month",
  "last-3-months": "Last 3 months",
  "this-year": "This year",
  "last-year": "Last year",
  "this-tax-year": "This income year ({span})",
  "last-tax-year": "Last income year ({span})",
};

export function reportPeriodFrom(value: unknown): ReportPeriod {
  return typeof value === "string" && (REPORT_PERIODS as readonly string[]).includes(value) ? (value as ReportPeriod) : "last-3-months";
}

export const REPORT_SHOWS = ["both", "income", "expense"] as const;
export type ReportShow = (typeof REPORT_SHOWS)[number];

export function reportShowFrom(value: unknown): ReportShow {
  return typeof value === "string" && (REPORT_SHOWS as readonly string[]).includes(value) ? (value as ReportShow) : "both";
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// The whole income year `today` falls in (offset 0) or one before it (-1):
// 1 July to 30 June.
export function incomeYear(today: string, offset = 0): DayRange {
  const year = Number(today.slice(0, 4));
  const start = (Number(today.slice(5, 7)) >= 7 ? year : year - 1) + offset;
  return { dateFrom: `${start}-07-01`, dateTo: `${start + 1}-06-30` };
}

// The days a period covers, counted from `today` ("YYYY-MM-DD" in the app's
// timezone). This month, the last 3 months, this year and this income year
// run to today, as resolveDateRange() has the calendar ones; the rest are
// whole.
export function reportRange(period: ReportPeriod, today: string): DayRange {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const monthsBack = (back: number) => {
    const start = new Date(Date.UTC(year, month - 1 - back, 1));
    return { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1 };
  };
  switch (period) {
    case "this-month":
      return { dateFrom: ymd(year, month, 1), dateTo: today };
    case "last-month": {
      const last = monthsBack(1);
      return { dateFrom: ymd(last.year, last.month, 1), dateTo: ymd(last.year, last.month, lastDayOf(last.year, last.month)) };
    }
    case "last-3-months": {
      const start = monthsBack(2);
      return { dateFrom: ymd(start.year, start.month, 1), dateTo: today };
    }
    case "this-year":
      return { dateFrom: ymd(year, 1, 1), dateTo: today };
    case "last-year":
      return { dateFrom: ymd(year - 1, 1, 1), dateTo: ymd(year - 1, 12, 31) };
    case "this-tax-year":
      return { dateFrom: incomeYear(today).dateFrom, dateTo: today };
    case "last-tax-year":
      return incomeYear(today, -1);
  }
}

export interface ReportView {
  period: ReportPeriod;
  walletId: string | null;
  show: ReportShow;
}

// The Reports URL for a view; "both" and all wallets are the defaults, so
// they stay out of it.
export function reportHref({ period, walletId, show }: ReportView): string {
  const params = new URLSearchParams({ period });
  if (walletId) params.set("wallet", walletId);
  if (show !== "both") params.set("show", show);
  return `/reports/detailed?${params.toString()}`;
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

// A spreadsheet runs a cell starting with =, +, -, @, a tab or a carriage
// return as a formula, so a category called "=Misc" or "+Bonus" would turn
// into #NAME? (or worse) when the file is opened. A leading apostrophe makes
// it plain text. Only names and labels: the figures are numbers we wrote.
const FORMULA_START = /^[=+\-@\t\r]/;
const asText = (value: string) => (FORMULA_START.test(value) ? `'${value}` : value);
const cell = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

// The same table as text, one line per row, for a spreadsheet.
export function reportCsv(months: string[], rows: ReportRow[], labels: { category: string; total: string; share: string; months: string[]; names: (row: ReportRow) => string }): string {
  const header = [labels.category, ...labels.months, labels.total, labels.share].map(asText);
  const lines = rows.map((row) => [asText(labels.names(row)), ...row.amounts.map((a) => a.toFixed(2)), row.total.toFixed(2), row.share === null ? "" : `${row.share}%`]);
  return [header, ...lines].map((line) => line.map(cell).join(",")).join("\n");
}

// "smartly-report-2026-08-01_2026-10-21.csv", and the wallet's name when one
// is picked. Letters, their marks and digits of any script stay, so a
// Bangla name keeps its vowel signs.
export function reportFileName(range: DayRange, wallet?: string | null): string {
  const slug = (wallet ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `smartly-report-${range.dateFrom}_${range.dateTo}${slug ? `-${slug}` : ""}.csv`;
}
