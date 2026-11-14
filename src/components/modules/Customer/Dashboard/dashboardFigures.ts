import type { CategoryBreakdown } from "@/lib/customer/api";

// The Dashboard's own figures, pure so the page can work them out on the
// server and the tests can pin them down.

export const DASHBOARD_PERIODS = ["this-month", "last-month", "this-year", "custom"] as const;
export type DashboardPeriodKey = (typeof DASHBOARD_PERIODS)[number];

export interface DayRange {
  dateFrom: string;
  dateTo: string;
}

export interface DashboardPeriod extends DayRange {
  key: DashboardPeriodKey;
  // The stretch the figures are compared with: the same days of last month
  // (or last year) for a period still under way, the month before for last
  // month, the as-long stretch just before a custom one.
  compare: DayRange;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const partsOf = (day: string) => day.split("-").map(Number) as [number, number, number];
const DAY_MS = 86_400_000;
const toTime = (day: string) => {
  const [y, m, d] = partsOf(day);
  return Date.UTC(y, m - 1, d);
};
const fromTime = (time: number) => {
  const date = new Date(time);
  return ymd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
};

// A real calendar day written "YYYY-MM-DD" (the URL is anyone's to edit).
export function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = partsOf(value);
  return year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= lastDayOf(year, month);
}

// The period the Dashboard shows, from ?period= (and ?from=&to= for a custom
// one). Anything it can't read -- an unknown period, a custom one without
// two days in order -- is this month.
export function readDashboardPeriod(params: { period?: string; from?: string; to?: string }, today: string): DashboardPeriod {
  const [year, month, date] = partsOf(today);
  const key = (DASHBOARD_PERIODS as readonly string[]).includes(params.period ?? "") ? (params.period as DashboardPeriodKey) : "this-month";

  if (key === "last-month") {
    const y = month === 1 ? year - 1 : year;
    const m = month === 1 ? 12 : month - 1;
    const by = m === 1 ? y - 1 : y;
    const bm = m === 1 ? 12 : m - 1;
    return { key, dateFrom: ymd(y, m, 1), dateTo: ymd(y, m, lastDayOf(y, m)), compare: { dateFrom: ymd(by, bm, 1), dateTo: ymd(by, bm, lastDayOf(by, bm)) } };
  }
  if (key === "this-year") {
    // Last year's 1 January to the same day (29 February reads as the 28th).
    return { key, dateFrom: ymd(year, 1, 1), dateTo: today, compare: { dateFrom: ymd(year - 1, 1, 1), dateTo: ymd(year - 1, month, Math.min(date, lastDayOf(year - 1, month))) } };
  }
  if (key === "custom" && isDay(params.from) && isDay(params.to) && params.from <= params.to) {
    const length = Math.round((toTime(params.to) - toTime(params.from)) / DAY_MS) + 1;
    const compareTo = toTime(params.from) - DAY_MS;
    return { key, dateFrom: params.from, dateTo: params.to, compare: { dateFrom: fromTime(compareTo - (length - 1) * DAY_MS), dateTo: fromTime(compareTo) } };
  }
  // This month so far, against the same days of last month.
  const ly = month === 1 ? year - 1 : year;
  const lm = month === 1 ? 12 : month - 1;
  return { key: "this-month", dateFrom: ymd(year, month, 1), dateTo: today, compare: { dateFrom: ymd(ly, lm, 1), dateTo: ymd(ly, lm, Math.min(date, lastDayOf(ly, lm))) } };
}

// How much a figure moved against the period it is compared with, as a
// percentage to one decimal. null when there is nothing to compare with.
export function changePercent(now: number, before: number): number | null {
  if (!(before > 0) || !Number.isFinite(now)) return null;
  return Math.round(((now - before) / before) * 1000) / 10;
}

export interface SpendingSlice {
  name: string;
  amount: number;
  percent: number;
  // The category's colour name ("orange"); null for the "Other" slice.
  color: string | null;
}

// The donut's slices: the biggest categories, and the rest together as
// one "Other" slice once there are more than `max`.
export function spendingSlices(breakdown: CategoryBreakdown, max = 6): SpendingSlice[] {
  const total = Number(breakdown.total);
  if (!(total > 0)) return [];
  const rows = breakdown.categories
    .map((c) => ({ name: c.name, amount: Number(c.amount), color: c.color || null }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const share = (amount: number) => Math.round((amount / total) * 100);
  if (rows.length <= max) return rows.map((row) => ({ ...row, percent: share(row.amount) }));
  const kept = rows.slice(0, max - 1);
  const rest = rows.slice(max - 1).reduce((sum, row) => sum + row.amount, 0);
  return [...kept.map((row) => ({ ...row, percent: share(row.amount) })), { name: "Other", amount: rest, percent: share(rest), color: null }];
}

// The chart colour of a category's colour name, as a CSS colour from the
// theme's tokens (so dark mode follows): the six category tones the design
// draws, amber, red, and a grey for anything else and "Other".
const CHART_VARS: Record<string, string> = {
  green: "--cat-1",
  lime: "--cat-1",
  orange: "--cat-2",
  purple: "--cat-3",
  violet: "--cat-3",
  blue: "--cat-4",
  indigo: "--cat-4",
  teal: "--cat-5",
  cyan: "--cat-5",
  pink: "--cat-6",
  yellow: "--warning-fill",
  red: "--expense-fill",
};

export function categoryChartColor(color: string | null | undefined): string {
  return `var(${(color && CHART_VARS[color]) || "--ink-faint"})`;
}

// The donut's conic gradient: each slice from where the last one ended.
export function donutGradient(slices: SpendingSlice[]): string {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  if (!(total > 0)) return "none";
  let start = 0;
  const stops = slices.map((slice) => {
    const end = Math.min(100, start + (slice.amount / total) * 100);
    const stop = `${categoryChartColor(slice.color)} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    start = end;
    return stop;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

// The chart's y axis: a clean top (85,000 → 1,00,000) and the three rules
// below it, a quarter apart. null when there is nothing to plot.
export function quarterAxis(top: number): number[] | null {
  if (!(top > 0) || !Number.isFinite(top)) return null;
  const magnitude = 10 ** Math.floor(Math.log10(top));
  const unit = top / magnitude;
  const step = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 4 ? 4 : unit <= 8 ? 8 : 10;
  const max = Math.max(4, step * magnitude);
  return [max, (max * 3) / 4, max / 2, max / 4, 0];
}

// The Dashboard board's axis: four equal steps, each a round 1, 2, 2.5 or 5
// of a power of ten, the smallest whose four steps reach the tallest bar
// (1,85,000 -> 50,000 steps, top 2,00,000). null when there is nothing to plot.
export function fourStepAxis(top: number): number[] | null {
  if (!(top > 0) || !Number.isFinite(top)) return null;
  const power = 10 ** Math.floor(Math.log10(top / 4));
  const step = [1, 2, 2.5, 5, 10].map((unit) => unit * power).find((unit) => unit * 4 >= top) ?? power * 10;
  return [4, 3, 2, 1, 0].map((i) => step * i);
}

// The ring's arcs on a circle of circumference 100 (r = 15.9155): each
// slice's dash and where it starts, the first at the top.
export function donutArcs(slices: SpendingSlice[]): { name: string; color: string; dash: string; offset: string }[] {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  let start = 0;
  return slices.map((slice) => {
    const share = total > 0 ? (slice.amount / total) * 100 : 0;
    const arc = { name: slice.name, color: slice.color === null ? "var(--chart-other)" : categoryChartColor(slice.color), dash: `${share.toFixed(3)} ${(100 - share).toFixed(3)}`, offset: (-start).toFixed(3) };
    start += share;
    return arc;
  });
}
