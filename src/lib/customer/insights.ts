import type { CategoryBreakdown, MonthlyBreakdown } from "./api";
import type { DateRangePreset } from "./dateRangePresets";
import { savingsRate } from "./homeInsights";

// The maths behind Insights: plain sentences built from the category
// breakdowns and the monthly breakdown the Reports page already calls. Pure,
// so the page derives everything on the server and the tests pin it down.

export const INSIGHT_PERIODS = ["this-month", "last-month", "last-3-months", "this-year"] as const;
export type InsightPeriod = (typeof INSIGHT_PERIODS)[number];

export const INSIGHT_PERIOD_LABELS: Record<InsightPeriod, string> = {
  "this-month": "This month",
  "last-month": "Last month",
  "last-3-months": "Last 3 months",
  "this-year": "This year",
};

export function isInsightPeriod(value: unknown): value is InsightPeriod {
  return typeof value === "string" && (INSIGHT_PERIODS as readonly string[]).includes(value);
}

export interface DayRange {
  dateFrom: string;
  dateTo: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const monthOf = (day: string) => ({ year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) });
// Whole months from `from`'s month to `to`'s month, inclusive.
export function monthSpan(range: DayRange): number {
  const a = monthOf(range.dateFrom);
  const b = monthOf(range.dateTo);
  return (b.year - a.year) * 12 + (b.month - a.month) + 1;
}

// The period to compare with: the same calendar months one step back.
// This month → last month; the last 3 months → the 3 before them; this
// year → the same months of last year.
export function previousRange(range: DayRange, period: InsightPeriod): DayRange {
  const { year, month } = monthOf(range.dateFrom);
  if (period === "this-year") {
    const end = monthOf(range.dateTo);
    return { dateFrom: ymd(year - 1, 1, 1), dateTo: ymd(end.year - 1, end.month, lastDayOf(end.year - 1, end.month)) };
  }
  const span = monthSpan(range);
  const start = new Date(Date.UTC(year, month - 1 - span, 1));
  const endMonth = new Date(Date.UTC(year, month - 2, 1));
  return {
    dateFrom: ymd(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    dateTo: ymd(endMonth.getUTCFullYear(), endMonth.getUTCMonth() + 1, lastDayOf(endMonth.getUTCFullYear(), endMonth.getUTCMonth() + 1)),
  };
}

// Percent change from `before` to `now`, one decimal; null when there was
// nothing before to compare with.
export function percentChange(now: number, before: number): number | null {
  if (!(before > 0)) return null;
  return Math.round(((now - before) / before) * 1000) / 10;
}

export interface PeriodTotals {
  income: number;
  expense: number;
  left: number;
  rate: number | null;
}

export function periodTotals(income: CategoryBreakdown, expense: CategoryBreakdown): PeriodTotals {
  const moneyIn = Number(income.total);
  const moneyOut = Number(expense.total);
  return { income: moneyIn, expense: moneyOut, left: moneyIn - moneyOut, rate: savingsRate(moneyIn, moneyOut) };
}

export interface RankedRow {
  rank: number;
  name: string;
  amount: number;
  // Share of the total, one decimal.
  share: number;
  // Width against the biggest row, for the bar.
  width: number;
  color: string;
}

// A breakdown's categories biggest first, each with its share of the total
// and its length against the biggest.
export function rankedRows(breakdown: CategoryBreakdown): RankedRow[] {
  const total = Number(breakdown.total);
  const rows = [...breakdown.categories].sort((a, b) => Number(b.amount) - Number(a.amount));
  const biggest = Number(rows[0]?.amount ?? 0);
  return rows.map((row, i) => {
    const amount = Number(row.amount);
    return {
      rank: i + 1,
      name: row.name,
      amount,
      share: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      width: biggest > 0 ? Math.round((amount / biggest) * 1000) / 10 : 0,
      color: row.color,
    };
  });
}

export interface ConcentrationNote {
  name: string;
  percent: number;
  // The runner-up, and what it brought before and now.
  second: { name: string; before: number; now: number } | null;
}

// When one source brings more than `threshold` percent of the money in: who
// it is, and how the second source moved against the previous period.
export function concentrationNote(income: CategoryBreakdown, previous: CategoryBreakdown, threshold = 60): ConcentrationNote | null {
  const rows = rankedRows(income);
  if (rows.length === 0 || rows[0].share <= threshold) return null;
  const second = rows[1];
  return {
    name: rows[0].name,
    percent: Math.round(rows[0].share),
    second: second ? { name: second.name, before: Number(previous.categories.find((c) => c.name === second.name)?.amount ?? 0), now: second.amount } : null,
  };
}

export interface CategoryMove {
  name: string;
  before: number;
  now: number;
  change: number;
  percent: number | null;
}

// Every category of either period, with how it moved; biggest absolute move
// first.
export function categoryMoves(current: CategoryBreakdown, previous: CategoryBreakdown): CategoryMove[] {
  const names = new Set([...current.categories.map((c) => c.name), ...previous.categories.map((c) => c.name)]);
  return [...names]
    .map((name) => {
      const now = Number(current.categories.find((c) => c.name === name)?.amount ?? 0);
      const before = Number(previous.categories.find((c) => c.name === name)?.amount ?? 0);
      return { name, before, now, change: Math.round((now - before) * 100) / 100, percent: percentChange(now, before) };
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

// The biggest fall in spending against the previous period, if any fell.
export function biggestDrop(current: CategoryBreakdown, previous: CategoryBreakdown): CategoryMove | null {
  return categoryMoves(current, previous).find((m) => m.change < 0) ?? null;
}

export interface MonthRate {
  // "YYYY-MM"
  month: string;
  income: number;
  expense: number;
  kept: number;
  rate: number | null;
}

// Month by month: what came in, what went out, what was kept and the share
// of income kept. The two breakdowns must cover the same months.
export function monthRates(income: MonthlyBreakdown, expense: MonthlyBreakdown): MonthRate[] {
  return income.months.map((month, i) => {
    const moneyIn = Number(income.totals[i] ?? 0);
    const moneyOut = Number(expense.totals[expense.months.indexOf(month)] ?? 0);
    return { month, income: moneyIn, expense: moneyOut, kept: moneyIn - moneyOut, rate: savingsRate(moneyIn, moneyOut) };
  });
}

// Whether the share kept is rising: the latest month's rate against the
// first month that has one, in points.
export function rateTrend(rates: MonthRate[]): { up: boolean; points: number; since: string } | null {
  const known = rates.filter((r) => r.rate !== null);
  if (known.length < 2) return null;
  const first = known[0];
  const last = known[known.length - 1];
  const points = (last.rate ?? 0) - (first.rate ?? 0);
  return { up: points >= 0, points: Math.abs(points), since: first.month };
}

export interface NetWorthParts {
  wallets: number;
  savings: number;
  assets: number;
  owedToYou: number;
  youOwe: number;
}

export interface NetWorth extends NetWorthParts {
  total: number;
  have: number;
  // Share of the bar that is green, 0–100.
  haveShare: number;
}

// Everything you have and are owed, minus what you owe.
export function netWorth(parts: NetWorthParts): NetWorth {
  const have = parts.wallets + parts.savings + parts.assets + parts.owedToYou;
  const owe = Math.abs(parts.youOwe);
  const gross = have + owe;
  return { ...parts, youOwe: owe, have, total: have - owe, haveShare: gross > 0 ? Math.round((have / gross) * 100) : 100 };
}

// Which part of the net worth is the largest, for the sentence under it.
export function biggestPart(parts: NetWorthParts): Exclude<keyof NetWorthParts, "youOwe"> | null {
  const positive = (["wallets", "savings", "assets", "owedToYou"] as const).filter((key) => parts[key] > 0);
  if (positive.length === 0) return null;
  return positive.sort((a, b) => parts[b] - parts[a])[0];
}

// "2026-10" → "October" / "Oct" in the reader's language. Server and client
// format the same way, so the month names never mismatch on hydration.
export function monthName(key: string, locale: "en" | "bn", style: "long" | "short" = "long", withYear = false): string {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", { month: style, ...(withYear && { year: "numeric" }), timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export interface PeriodLabels {
  // "October 2026", "August–October 2026", "January–October 2026".
  period: string;
  // What it is compared with: "September", "May–July", "2025".
  previous: string;
  // True when `previous` is a year, so the sentence says "the same months of".
  previousIsYear: boolean;
  // Short column headings for the changes table: "Sep" / "Oct", "2025" / "2026".
  before: string;
  now: string;
}

const monthKey = (day: string) => day.slice(0, 7);
const span = (from: string, to: string, locale: "en" | "bn", style: "long" | "short", withYear: boolean) => {
  const a = monthName(from, locale, style);
  const b = monthName(to, locale, style, withYear);
  return from === to ? b : `${a}–${b}`;
};

export function periodLabels(range: DayRange, previous: DayRange, period: InsightPeriod, locale: "en" | "bn"): PeriodLabels {
  const from = monthKey(range.dateFrom);
  const to = monthKey(range.dateTo);
  const prevFrom = monthKey(previous.dateFrom);
  const prevTo = monthKey(previous.dateTo);
  if (period === "this-year") {
    const year = (key: string) => new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", { year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00.000Z`));
    return { period: span(from, to, locale, "long", true), previous: year(prevFrom), previousIsYear: true, before: year(prevFrom), now: year(from) };
  }
  return {
    period: span(from, to, locale, "long", true),
    previous: span(prevFrom, prevTo, locale, "long", false),
    previousIsYear: false,
    before: span(prevFrom, prevTo, locale, "short", false),
    now: span(from, to, locale, "short", false),
  };
}

// The default period for the overview, and the one a URL names.
export function insightPeriodFrom(value: unknown): InsightPeriod {
  return isInsightPeriod(value) ? value : "this-month";
}

export const INSIGHT_PRESET: Record<InsightPeriod, DateRangePreset> = {
  "this-month": "this-month",
  "last-month": "last-month",
  "last-3-months": "last-3-months",
  "this-year": "this-year",
};
