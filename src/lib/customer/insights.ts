import type { CategoryBreakdown, MonthlyBreakdown } from "./api";
import type { DateRangePreset } from "./dateRangePresets";
import { savingsRate } from "./homeInsights";
import { toBanglaDigits } from "@/lib/i18n/banglaDates";

// The maths behind Insights: plain sentences built from the monthly
// breakdowns the Reports page also calls. Pure, so the page derives
// everything on the server and the tests pin it down.

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

type Locale = "en" | "bn";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const partsOf = (day: string) => ({ year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)), date: Number(day.slice(8, 10)) });

// Whole calendar months from `from`'s month to `to`'s month, inclusive.
export function monthSpan(range: DayRange): number {
  const a = partsOf(range.dateFrom);
  const b = partsOf(range.dateTo);
  return (b.year - a.year) * 12 + (b.month - a.month) + 1;
}

// How many months the range covers, a part-month counted by its share of
// days: 1–21 October is 0.68 of a month, 1 January to 21 October 9.68.
// What "a month on average" divides by, so the month under way doesn't
// count as a whole one.
export function monthsElapsed(range: DayRange): number {
  const from = partsOf(range.dateFrom);
  const to = partsOf(range.dateTo);
  const first = from.year * 12 + from.month - 1;
  const last = to.year * 12 + to.month - 1;
  let total = 0;
  for (let index = first; index <= last; index++) {
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    const days = lastDayOf(year, month);
    const start = index === first ? from.date : 1;
    const end = index === last ? to.date : days;
    total += (end - start + 1) / days;
  }
  return total;
}

// A month's worth of `amount` over `months` (as monthsElapsed counts them),
// in whole taka. Null for a month or less, which has nothing to average:
// this month, or this year all through January, where dividing by 3/31 of
// a month (on 3 January) would turn a ৳ 15,000 rent into ৳ 1,55,000 a month.
export function monthlyAverage(amount: number, months: number): number | null {
  if (!(months > 1)) return null;
  return Math.round(amount / months);
}

// `day` moved `months` calendar months back, on the same day of the month,
// or on that month's last day when it is shorter or `day` was a last day.
function monthsBack(day: string, months: number): string {
  const { year, month, date } = partsOf(day);
  const target = new Date(Date.UTC(year, month - 1 - months, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth() + 1;
  const last = lastDayOf(targetYear, targetMonth);
  return ymd(targetYear, targetMonth, date === lastDayOf(year, month) ? last : Math.min(date, last));
}

// The period to compare with: the same stretch of days one step back, so a
// month 21 days in meets the first 21 days of the month before, never the
// whole of it. This month 1–21 Oct → 1–21 Sep; the last 3 months 1 Aug–21
// Oct → 1 May–21 Jul; this year → the same days of last year. A whole month
// (last month) meets the whole month before it.
export function previousRange(range: DayRange, period: InsightPeriod): DayRange {
  const step = period === "this-year" ? 12 : monthSpan(range);
  return { dateFrom: monthsBack(range.dateFrom, step), dateTo: monthsBack(range.dateTo, step) };
}

// Percent change from `before` to `now`, one decimal; null when there was
// nothing before to compare with.
export function percentChange(now: number, before: number): number | null {
  if (!(before > 0)) return null;
  return Math.round(((now - before) / before) * 1000) / 10;
}

// How a figure moved against the period before: a percent when there was
// something above zero to measure from; for a figure that can go below zero
// (Left over), the amount when the period before had money in or out but
// ended at zero or under; "new" when nothing came before; "same" when
// nothing moved at all.
export type Movement = { kind: "percent"; percent: number; change: number } | { kind: "amount"; change: number } | { kind: "new"; change: number } | { kind: "same" };

export function movement(now: number, before: number, signed?: { hadBefore: boolean }): Movement {
  const change = Math.round((now - before) * 100) / 100;
  const percent = percentChange(now, before);
  if (percent !== null) return { kind: "percent", percent, change };
  if (change === 0) return { kind: "same" };
  if (signed?.hadBefore) return { kind: "amount", change };
  return { kind: "new", change };
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

// A monthly breakdown read as one category breakdown: every category with
// its total over the months. The category-breakdown endpoint lists only the
// ten biggest, which left the rest out of the counts, the split bar and
// what changed.
export function categoryTotals(monthly: MonthlyBreakdown): CategoryBreakdown {
  return {
    type: monthly.type,
    total: monthly.total,
    categories: monthly.rows.map((row) => ({ name: row.name, amount: row.total, percent: 0, color: row.color })),
  };
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
  // Below zero when more went out than came in.
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

// The months a trend can be read from: the one under way only once it is
// over, since 21 days in it has its salary but not all of its spending.
export function completeMonths(rates: MonthRate[], today: string): MonthRate[] {
  const current = today.slice(0, 7);
  const { year, month, date } = partsOf(today);
  const over = date === lastDayOf(year, month);
  return rates.filter((r) => r.month < current || (r.month === current && over));
}

// The month under way ("YYYY-MM") while the rates reach it and it isn't
// over: the month completeMonths leaves out, which the charts draw apart and
// call "so far". Null once it is over.
export function monthUnderWay(rates: MonthRate[], today: string): string | null {
  const finished = new Set(completeMonths(rates, today).map((r) => r.month));
  return rates.find((r) => !finished.has(r.month))?.month ?? null;
}

export interface RateTrend {
  direction: "up" | "down" | "same";
  // How far, in points; 0 when the direction is "same".
  points: number;
  // "YYYY-MM": the first month it is measured from.
  since: string;
}

// Whether the share kept is rising: the latest month's rate against the
// first month that has one, in points.
export function rateTrend(rates: MonthRate[]): RateTrend | null {
  const known = rates.filter((r) => r.rate !== null);
  if (known.length < 2) return null;
  const first = known[0];
  const last = known[known.length - 1];
  const points = (last.rate ?? 0) - (first.rate ?? 0);
  return { direction: points > 0 ? "up" : points < 0 ? "down" : "same", points: Math.abs(points), since: first.month };
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

// Month names written out rather than taken from the runtime's ICU data:
// Node and each browser abbreviate Bangla months differently ("সেপ্ট",
// "সেপ্টে"), and the server's text must match the hydrating browser's. The
// Bangla short names are the board's (lib/i18n/banglaDates.ts).
const MONTH_NAMES: Record<Locale, Record<"long" | "short", string[]>> = {
  en: {
    long: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
  bn: {
    long: ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"],
    short: ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"],
  },
};

const localDigits = (value: number, locale: Locale) => (locale === "bn" ? toBanglaDigits(value) : String(value));

// "2026-10" → "October" / "Oct" in the reader's language, "October 2026"
// with the year. Server and client print the very same text.
export function monthName(key: string, locale: Locale, style: "long" | "short" = "long", withYear = false): string {
  const [year, month] = key.split("-").map(Number);
  const name = MONTH_NAMES[locale]?.[style][month - 1] ?? key;
  return withYear ? `${name} ${localDigits(year, locale)}` : name;
}

// A stretch of days, day first as the app writes dates: "1–21 October
// 2026", "1 August – 21 October 2026", "August–October 2026" for whole
// months. A range across a new year names both years ("November 2026 –
// January 2027"), whatever `withYear` says. "short" writes "Oct" and drops
// the spaces round the dash, for a column head.
export function rangeLabel(dateFrom: string, dateTo: string, locale: Locale, style: "long" | "short" = "long", withYear = true): string {
  const a = partsOf(dateFrom);
  const b = partsOf(dateTo);
  const names = MONTH_NAMES[locale][style];
  const month = (p: typeof a) => names[p.month - 1];
  const day = (p: typeof a) => localDigits(p.date, locale);
  const year = (p: typeof a) => localDigits(p.year, locale);
  const dash = style === "long" ? " – " : "–";
  const crossesYear = a.year !== b.year;
  const tail = withYear && !crossesYear ? ` ${year(b)}` : "";
  if (a.date === 1 && b.date === lastDayOf(b.year, b.month)) {
    if (crossesYear) return `${month(a)} ${year(a)}${dash}${month(b)} ${year(b)}`;
    return a.month === b.month ? `${month(a)}${tail}` : `${month(a)}–${month(b)}${tail}`;
  }
  if (crossesYear) return `${day(a)} ${month(a)} ${year(a)}${dash}${day(b)} ${month(b)} ${year(b)}`;
  if (a.month === b.month) return `${a.date === b.date ? day(a) : `${day(a)}–${day(b)}`} ${month(a)}${tail}`;
  return `${day(a)} ${month(a)}${dash}${day(b)} ${month(b)}${tail}`;
}

export interface PeriodLabels {
  // What the page covers: "1–21 October 2026", "September 2026".
  period: string;
  // What it is compared with, inside a sentence: "1–21 September",
  // "August", "1 January – 21 October 2025".
  previous: string;
  // The two, short, for the totals' "vs" line and the changes table's
  // caption: "1–21 Sep" / "1–21 Oct"; for the year "1 Jan–21 Oct 2025".
  before: string;
  now: string;
  // The changes table's column heads: the short labels, or the two years
  // alone when both periods are the same days of a year.
  heads: [string, string];
}

export function periodLabels(range: DayRange, previous: DayRange, period: InsightPeriod, locale: Locale): PeriodLabels {
  const sameDays = period === "this-year";
  const otherYear = previous.dateTo.slice(0, 4) !== range.dateTo.slice(0, 4);
  const before = rangeLabel(previous.dateFrom, previous.dateTo, locale, "short", sameDays);
  const now = rangeLabel(range.dateFrom, range.dateTo, locale, "short", sameDays);
  return {
    period: rangeLabel(range.dateFrom, range.dateTo, locale, "long", true),
    previous: rangeLabel(previous.dateFrom, previous.dateTo, locale, "long", otherYear),
    before,
    now,
    heads: sameDays ? [localDigits(partsOf(previous.dateFrom).year, locale), localDigits(partsOf(range.dateFrom).year, locale)] : [before, now],
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
