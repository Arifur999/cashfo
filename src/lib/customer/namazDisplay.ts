import type { HabitMonthTracker } from "./api";
import { hijriParts, WEEKDAY_LONG } from "./habitDisplay";

// The maths behind Namaz: how a month sheet reads with today's data (a
// prayer is ticked or not), the per-prayer and per-day figures, the year
// so far, and the sentences the sheet points out. Pure.

export const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const pad = (n: number) => String(n).padStart(2, "0");

export type CellState = "prayed" | "missed" | "open" | "locked";

// A past day's empty cell is a miss; today's is still open; a later day is
// locked. Everything ticked is prayed.
export function cellState(tracker: HabitMonthTracker, day: number, item: string): CellState {
  if (tracker.checks.some((c) => c.day === day && c.item === item)) return "prayed";
  if (tracker.todayDay !== null && day === tracker.todayDay) return "open";
  if (day <= tracker.elapsedDays) return "missed";
  return "locked";
}

// Whether a cell can be tapped: today, or any day already past (the server
// allows the same), and anything already ticked so it can be unticked.
export function canMark(tracker: HabitMonthTracker, day: number): boolean {
  return day <= (tracker.todayDay ?? tracker.elapsedDays);
}

export interface MonthSummary {
  // Prayers that were due on the days fully past.
  due: number;
  prayed: number;
  missed: number;
  pct: number;
  // Days fully past where every prayer was ticked.
  perfectDays: number;
  // Full days in a row ending yesterday (or today, if today is full).
  perfectRun: number;
  todayDone: number;
  // Ticks so far, today included.
  prayedSoFar: number;
}

export function monthSummary(tracker: HabitMonthTracker): MonthSummary {
  const items = tracker.items.length;
  const elapsed = tracker.elapsedDays;
  const due = elapsed * items;
  const prayed = tracker.checks.filter((c) => c.day <= elapsed).length;
  const fullDay = (day: number) => tracker.checks.filter((c) => c.day === day).length === items && items > 0;
  let perfectDays = 0;
  for (let d = 1; d <= elapsed; d++) if (fullDay(d)) perfectDays++;
  const todayDone = tracker.todayDay !== null ? tracker.checks.filter((c) => c.day === tracker.todayDay).length : 0;
  let perfectRun = 0;
  let cursor = tracker.todayDay !== null && fullDay(tracker.todayDay) ? tracker.todayDay : elapsed;
  while (cursor >= 1 && fullDay(cursor)) {
    perfectRun++;
    cursor--;
  }
  return { due, prayed, missed: Math.max(0, due - prayed), pct: due > 0 ? Math.round((prayed / due) * 100) : 0, perfectDays, perfectRun, todayDone, prayedSoFar: tracker.checks.length };
}

export interface PrayerSummary {
  item: string;
  prayed: number;
  missed: number;
  due: number;
  pct: number;
}

export function prayerSummaries(tracker: HabitMonthTracker): PrayerSummary[] {
  const due = tracker.elapsedDays;
  return tracker.items.map((item) => {
    const prayed = tracker.checks.filter((c) => c.item === item && c.day <= due).length;
    return { item, prayed, missed: Math.max(0, due - prayed), due, pct: due > 0 ? Math.round((prayed / due) * 100) : 0 };
  });
}

// Prayed count per day of the month, with whether the day is still open
// (today) or not reached.
export function dayTotals(tracker: HabitMonthTracker): { day: number; prayed: number; state: "past" | "open" | "locked" }[] {
  return Array.from({ length: tracker.totalDays }, (_, i) => {
    const day = i + 1;
    const state = tracker.todayDay === day ? "open" : day <= tracker.elapsedDays ? "past" : "locked";
    return { day, prayed: tracker.checks.filter((c) => c.day === day).length, state };
  });
}

// 0 = Sunday … 6 = Saturday for a day of the tracker's month.
export function weekdayOfDay(tracker: HabitMonthTracker, day: number): number {
  return new Date(Date.UTC(tracker.year as number, (tracker.month as number) - 1, day)).getUTCDay();
}

// "Rabiʻ I – Rabiʻ II 1448": the Hijri months a Gregorian month spans.
export function hijriRange(year: number, month: number, locale: "en" | "bn" = "en"): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const tag = locale === "bn" ? "bn-BD" : "en-GB";
  const name = (day: string) => {
    const parts = new Intl.DateTimeFormat(`${tag}-u-ca-islamic-umalqura`, { timeZone: "UTC", month: "long" }).formatToParts(new Date(`${day}T00:00:00.000Z`));
    return parts.find((p) => p.type === "month")?.value ?? "";
  };
  const first = name(`${year}-${pad(month)}-01`);
  const end = name(`${year}-${pad(month)}-${pad(last)}`);
  const hy = hijriParts(`${year}-${pad(month)}-${pad(last)}`).year;
  const yearText = new Intl.NumberFormat(tag, { useGrouping: false }).format(hy);
  return `${first === end ? first : `${first} – ${end}`} ${yearText}`;
}

export interface YearMonth {
  tracker: HabitMonthTracker;
  month: number;
  pct: number;
  prayed: number;
  due: number;
}

// The months of a year that have a sheet, oldest first, with the best one.
export function yearSummary(trackers: HabitMonthTracker[], year: number): { months: YearMonth[]; prayed: number; due: number; pct: number; best: YearMonth | null } {
  const months = trackers
    .filter((tr) => tr.year === year && tr.month !== null)
    .sort((a, b) => (a.month as number) - (b.month as number))
    .map((tracker) => {
      const s = monthSummary(tracker);
      return { tracker, month: tracker.month as number, pct: s.pct, prayed: s.prayed, due: s.due };
    });
  const prayed = months.reduce((sum, m) => sum + m.prayed, 0);
  const due = months.reduce((sum, m) => sum + m.due, 0);
  const finished = months.filter((m) => m.tracker.todayDay === null && m.due > 0);
  const best = finished.length ? finished.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;
  return { months, prayed, due, pct: due > 0 ? Math.round((prayed / due) * 100) : 0, best };
}

export function trackerFor(trackers: HabitMonthTracker[], year: number, month: number): HabitMonthTracker | null {
  return trackers.find((tr) => tr.year === year && tr.month === month) ?? null;
}

export interface Insight {
  tone: "money" | "expense" | "warning" | "insights";
  // Sentence pieces the client joins with t().
  key: "nothingMissed" | "mostMissed" | "strongest" | "weekday" | "run" | "upFrom" | "downFrom";
  item?: string;
  n?: number;
  of?: number;
  weekday?: string;
  pct?: number;
  previousPct?: number;
}

// What stands out in a month: nothing missed yet, the most missed and the
// strongest prayer, the weekday that collects the misses, the current run
// of full days, and how it compares with the month before.
export function monthInsights(tracker: HabitMonthTracker, previous: HabitMonthTracker | null): Insight[] {
  const out: Insight[] = [];
  const s = monthSummary(tracker);
  const prayers = prayerSummaries(tracker);
  if (s.due > 0 && s.missed === 0) out.push({ tone: "money", key: "nothingMissed", n: tracker.elapsedDays });
  if (s.due > 0 && s.missed > 0) {
    const worst = [...prayers].sort((a, b) => b.missed - a.missed)[0];
    if (worst.missed > 0) out.push({ tone: "expense", key: "mostMissed", item: worst.item, n: worst.missed });
    const best = [...prayers].sort((a, b) => b.prayed - a.prayed)[0];
    if (best.prayed > 0 && best.item !== worst.item) out.push({ tone: "money", key: "strongest", item: best.item, n: best.prayed, of: best.due });
    const byWeekday = new Map<number, number>();
    for (let d = 1; d <= tracker.elapsedDays; d++) {
      const missed = tracker.items.length - tracker.checks.filter((c) => c.day === d).length;
      if (missed > 0) byWeekday.set(weekdayOfDay(tracker, d), (byWeekday.get(weekdayOfDay(tracker, d)) ?? 0) + missed);
    }
    const top = [...byWeekday].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= Math.max(3, s.missed / 3)) out.push({ tone: "warning", key: "weekday", weekday: WEEKDAY_LONG[top[0]], n: top[1], of: s.missed });
  }
  if (s.perfectRun >= 2) out.push({ tone: "insights", key: "run", n: s.perfectRun });
  if (previous) {
    const p = monthSummary(previous);
    if (p.due > 0 && s.due > 0) out.push({ tone: s.pct >= p.pct ? "money" : "warning", key: s.pct >= p.pct ? "upFrom" : "downFrom", pct: s.pct, previousPct: p.pct });
  }
  return out.slice(0, 4);
}
