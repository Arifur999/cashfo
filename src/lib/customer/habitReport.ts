// Daily habits › Monthly report (the DailyHabitsReport board): one month of
// every habit as a sheet of days, with the month's figures, each habit's
// share, the weeks and what stands out. Pure, so the page and its tests
// agree.
//
// A day of a habit is done, missed (planned, past, not done), resting (not
// planned, or before the habit started), open (today, not done yet) or
// later in the month. "N times a week" plans no single day: a day it was
// done is done, the rest are resting, and a week that ended short of N
// counts the shortfall as missed (on the week's last day in the month).
import type { Habit, HabitMonthLog } from "./api";
import { habitStart, isPlannedOn, weekdayOf, weekOf } from "./habitDisplay";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";

export type CellState = "done" | "missed" | "rest" | "open" | "later";

export interface ReportDay {
  key: string;
  day: number;
  // 0 Sunday … 6 Saturday.
  weekday: number;
}

export interface HabitReportRow {
  habit: Habit;
  cells: CellState[];
  done: number;
  // Done plus missed: what was due by now.
  due: number;
  missed: number;
  // Days done in a row within the month (a missed day breaks it, a rest
  // day doesn't).
  bestRun: number;
  // Misses on each day of the month (for "N times a week", a short week's
  // misses on its last day in the month).
  missedAt: number[];
}

export interface DayTotal {
  done: number;
  due: number;
}

export interface MonthSummary {
  done: number;
  due: number;
  pct: number | null;
}

export interface HabitMonthReport extends MonthSummary {
  month: string;
  days: ReportDay[];
  rows: HabitReportRow[];
  // Per day: done of planned (today's open ones too); null for a day still
  // ahead or with nothing planned.
  totals: (DayTotal | null)[];
  missed: number;
  perfect: number;
  longest: { habit: Habit; run: number } | null;
  // Days 1–7, 8–14 …: the share done, null with nothing due.
  weeks: { from: number; to: number; pct: number | null }[];
  // The month's misses by weekday, 0 Sunday … 6 Saturday.
  missesByWeekday: number[];
}

const pad = (n: number) => String(n).padStart(2, "0");

export const daysOfMonth = (month: string): ReportDay[] => {
  const [year, number] = month.split("-").map(Number);
  const length = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length }, (_, i) => {
    const key = `${month}-${pad(i + 1)}`;
    return { key, day: i + 1, weekday: weekdayOf(key) };
  });
};

export const pctOf = (done: number, due: number): number | null => (due > 0 ? Math.round((done / due) * 100) : null);

// The habits a month shows: those started by its last day (or today), and
// archived ones only when they were logged in it.
export function habitsInMonth(habits: Habit[], logs: HabitMonthLog[], month: string, today: string): Habit[] {
  const last = daysOfMonth(month).at(-1)!.key;
  const until = last < today ? last : today;
  return habits.filter((habit) => habitStart(habit, logs) <= until && (!habit.isArchived || logs.some((l) => l.habitId === habit.id && l.date.slice(0, 7) === month)));
}

function rowFor(habit: Habit, logs: HabitMonthLog[], days: ReportDay[], today: string, locale?: FormatLocale): HabitReportRow {
  const start = habitStart(habit, logs);
  const done = new Set(logs.filter((l) => l.habitId === habit.id && l.completed).map((l) => l.date.slice(0, 10)));
  const weekly = habit.frequencyType === "WEEKLY_COUNT";
  const cells: CellState[] = days.map(({ key }) => {
    if (key > today) return "later";
    if (done.has(key)) return "done";
    if (key < start || weekly || !isPlannedOn(habit, key)) return "rest";
    return key === today ? "open" : "missed";
  });
  const missedAt = days.map(() => 0);
  let doneCount = 0;
  if (weekly) {
    // Each of the reader's weeks, as far as it lies in the month and the
    // habit had started: N due (fewer in a short part-week), a shortfall
    // missed once the week is over.
    const need = Math.max(1, habit.weeklyCount ?? 1);
    const weeks = new Map<string, { eligible: number[]; done: number; ended: boolean }>();
    days.forEach(({ key }, i) => {
      if (key > today || key < start) return;
      const week = weekOf(key, locale);
      const entry = weeks.get(week[0]) ?? { eligible: [], done: 0, ended: week[6] < today };
      entry.eligible.push(i);
      if (done.has(key)) entry.done++;
      weeks.set(week[0], entry);
    });
    for (const week of weeks.values()) {
      const due = Math.min(need, week.eligible.length);
      const got = Math.min(week.done, due);
      doneCount += got;
      if (week.ended && got < due) missedAt[week.eligible.at(-1)!] += due - got;
    }
  } else {
    cells.forEach((cell, i) => {
      if (cell === "done") doneCount++;
      if (cell === "missed") missedAt[i] = 1;
    });
  }
  const missed = missedAt.reduce((sum, n) => sum + n, 0);
  let run = 0;
  let bestRun = 0;
  for (const cell of cells) {
    if (cell === "done") bestRun = Math.max(bestRun, ++run);
    else if (cell === "missed") run = 0;
  }
  return { habit, cells, done: doneCount, due: doneCount + missed, missed, bestRun, missedAt };
}

// A month's done of due, for its card in the month list.
export function monthSummary(habits: Habit[], logs: HabitMonthLog[], month: string, today: string, locale?: FormatLocale): MonthSummary {
  const days = daysOfMonth(month);
  const rows = habitsInMonth(habits, logs, month, today).map((habit) => rowFor(habit, logs, days, today, locale));
  const done = rows.reduce((sum, row) => sum + row.done, 0);
  const due = rows.reduce((sum, row) => sum + row.due, 0);
  return { done, due, pct: pctOf(done, due) };
}

export function habitMonthReport(habits: Habit[], logs: HabitMonthLog[], month: string, today: string, locale?: FormatLocale): HabitMonthReport {
  const days = daysOfMonth(month);
  const rows = habitsInMonth(habits, logs, month, today).map((habit) => rowFor(habit, logs, days, today, locale));
  const done = rows.reduce((sum, row) => sum + row.done, 0);
  const due = rows.reduce((sum, row) => sum + row.due, 0);
  const missed = rows.reduce((sum, row) => sum + row.missed, 0);

  let perfect = 0;
  const totals = days.map((_, i): DayTotal | null => {
    const cells = rows.map((row) => row.cells[i]);
    if (cells.some((cell) => cell === "later")) return null;
    const got = cells.filter((cell) => cell === "done").length;
    const planned = got + cells.filter((cell) => cell === "missed" || cell === "open").length;
    if (planned === 0) return null;
    if (got === planned) perfect++;
    return { done: got, due: planned };
  });

  const weeks: HabitMonthReport["weeks"] = [];
  for (let from = 0; from < days.length; from += 7) {
    const to = Math.min(days.length, from + 7);
    let got = 0;
    let lost = 0;
    for (const row of rows) {
      for (let i = from; i < to; i++) {
        if (row.cells[i] === "done") got++;
        lost += row.missedAt[i];
      }
    }
    weeks.push({ from: from + 1, to, pct: pctOf(got, got + lost) });
  }

  const longestRow = [...rows].sort((a, b) => b.bestRun - a.bestRun)[0];
  const missesByWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const row of rows) row.missedAt.forEach((n, i) => (missesByWeekday[days[i].weekday] += n));
  return {
    month,
    days,
    rows,
    totals,
    done,
    due,
    pct: pctOf(done, due),
    missed,
    perfect,
    longest: longestRow && longestRow.bestRun > 0 ? { habit: longestRow.habit, run: longestRow.bestRun } : null,
    weeks,
    missesByWeekday,
  };
}

export type ReportTag = "best" | "needs-work" | null;

// The best habit of the month and the one that needs work, when at least
// two had something due.
export function habitTags(rows: HabitReportRow[]): Map<string, ReportTag> {
  const tags = new Map<string, ReportTag>();
  const due = rows.filter((row) => row.due > 0);
  if (due.length < 2) return tags;
  const rate = (row: HabitReportRow) => row.done / row.due;
  const low = [...due].sort((a, b) => rate(a) - rate(b))[0];
  const high = [...due].sort((a, b) => rate(b) - rate(a))[0];
  if (rate(low) < 1) tags.set(low.habit.id, "needs-work");
  if (high !== low) tags.set(high.habit.id, "best");
  return tags;
}
