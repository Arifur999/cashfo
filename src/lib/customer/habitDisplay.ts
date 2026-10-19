import type { Habit, HabitMonthLog } from "./api";

// The maths behind Daily habits and the Habits dashboard: which days a
// habit is planned for, how a week and a month read, rates against the
// planned days (the API's stats divide by 30), and the Hijri calendar.
// Pure, so the server page derives and the tests pin it down.

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

export const dayKey = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
export const dayOf = (key: string) => new Date(`${key}T00:00:00.000Z`);

// Days after (or before, when negative) a "YYYY-MM-DD" day.
export function shiftDay(key: string, days: number): string {
  return dayKey(new Date(dayOf(key).getTime() + days * DAY_MS));
}

// 0 = Sunday … 6 = Saturday, the convention Habit.weeklyDays uses.
export function weekdayOf(key: string): number {
  return dayOf(key).getUTCDay();
}

// The app's week runs Saturday to Friday.
export const WEEK_START = 6;
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The app's week runs Saturday first.
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];

// The seven days of the week `key` falls in, Saturday first.
export function weekOf(key: string): string[] {
  const back = (weekdayOf(key) - WEEK_START + 7) % 7;
  const start = shiftDay(key, -back);
  return Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
}

// The last `count` days ending on `key`, oldest first.
export function lastDays(key: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftDay(key, i - count + 1));
}

// Whether a habit is planned for a day. "A few times a week" can be done
// on any day, so every day is planned.
export function isPlannedOn(habit: Pick<Habit, "frequencyType" | "weeklyDays">, key: string): boolean {
  return habit.frequencyType !== "WEEKLY_DAYS" || habit.weeklyDays.includes(weekdayOf(key));
}

// Habits that are not planned today are resting.
export function isRestDay(habit: Pick<Habit, "frequencyType" | "weeklyDays">, key: string): boolean {
  return !isPlannedOn(habit, key);
}

export interface RuleLabel {
  // "Every day", "Sunday to Thursday", "3 times a week".
  days: string;
  // "30 min", "8 glasses", or null for a plain tick.
  amount: string | null;
}

// A run of consecutive weekdays reads as a range; anything else lists them.
function daysPhrase(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return "Every day";
  if (sorted.length === 0) return "No day planned";
  // Rotate so the run can start on Saturday (6) and continue through Sunday.
  const order = [6, 0, 1, 2, 3, 4, 5];
  const positions = sorted.map((d) => order.indexOf(d)).sort((a, b) => a - b);
  const contiguous = positions.every((p, i) => i === 0 || p === positions[i - 1] + 1);
  if (contiguous && sorted.length > 2) return `${WEEKDAY_LONG[order[positions[0]]]} to ${WEEKDAY_LONG[order[positions[positions.length - 1]]]}`;
  return positions.map((p) => WEEKDAY_SHORT[order[p]]).join(", ");
}

export function ruleLabel(habit: Pick<Habit, "frequencyType" | "weeklyDays" | "weeklyCount" | "targetValue" | "unit">): RuleLabel {
  const days = habit.frequencyType === "DAILY" ? "Every day" : habit.frequencyType === "WEEKLY_DAYS" ? daysPhrase(habit.weeklyDays) : `${habit.weeklyCount ?? 1} times a week`;
  const amount = habit.targetValue ? `${habit.targetValue} ${habit.unit ?? ""}`.trim() : null;
  return { days, amount };
}

// How many of the given days a habit is planned for; "N times a week"
// counts N per week touched.
export function plannedCount(habit: Pick<Habit, "frequencyType" | "weeklyDays" | "weeklyCount">, days: string[]): number {
  if (habit.frequencyType === "WEEKLY_COUNT") {
    const weeks = new Set(days.map((d) => weekOf(d)[0]));
    return weeks.size * (habit.weeklyCount ?? 1);
  }
  return days.filter((d) => isPlannedOn(habit, d)).length;
}

// Completed logs within the days, as a share of the planned count.
export function completionRate(habit: Pick<Habit, "id" | "frequencyType" | "weeklyDays" | "weeklyCount">, logs: HabitMonthLog[], days: string[]): number | null {
  const planned = plannedCount(habit, days);
  if (planned === 0) return null;
  const set = new Set(days);
  const done = logs.filter((l) => l.habitId === habit.id && l.completed && set.has(l.date.slice(0, 10))).length;
  return Math.min(100, Math.round((done / planned) * 100));
}

export type DayMark = "done" | "missed" | "rest" | "open" | "future";

// The first day a habit counts from: when it was added, or its earliest
// log if that is earlier (a habit can be logged for days before it was
// added to the app).
export function habitStart(habit: Pick<Habit, "id" | "createdAt">, logs: HabitMonthLog[]): string {
  const first = logs
    .filter((l) => l.habitId === habit.id)
    .map((l) => l.date.slice(0, 10))
    .sort()[0];
  const created = habit.createdAt.slice(0, 10);
  return first && first < created ? first : created;
}

// Whether a day counts for a habit: planned, and not before it started.
export function countsOn(habit: Pick<Habit, "id" | "frequencyType" | "weeklyDays" | "createdAt">, logs: HabitMonthLog[], day: string): boolean {
  return isPlannedOn(habit, day) && day >= habitStart(habit, logs);
}

// How a past or present day reads for a habit: done, missed, a rest day,
// still open (today, not done yet) or not reached.
export function dayMark(habit: Pick<Habit, "id" | "frequencyType" | "weeklyDays" | "createdAt">, logs: HabitMonthLog[], day: string, today: string): DayMark {
  if (day > today) return "future";
  const done = logs.some((l) => l.habitId === habit.id && l.completed && l.date.slice(0, 10) === day);
  if (done) return "done";
  if (!countsOn(habit, logs, day)) return "rest";
  return day === today ? "open" : "missed";
}

// The longest streak up to `today`, by the server's rule (streak.ts): days
// done, skipping the days a habit isn't planned -- or, for "a few times a
// week", the weeks in a row that met the count (this week once it does).
export function bestStreak(habit: Pick<Habit, "id" | "frequencyType" | "weeklyDays" | "weeklyCount">, logs: HabitMonthLog[], today: string, lookBack = 365): number {
  const done = new Set(logs.filter((l) => l.habitId === habit.id && l.completed).map((l) => l.date.slice(0, 10)));
  if (habit.frequencyType === "WEEKLY_COUNT") {
    const need = Math.max(1, habit.weeklyCount ?? 1);
    const thisWeek = weekOf(today)[0];
    // Oldest week first; a Map keeps the order its weeks were met in.
    const weeks = new Map<string, number>();
    for (const day of lastDays(today, lookBack)) {
      const week = weekOf(day)[0];
      weeks.set(week, (weeks.get(week) ?? 0) + (done.has(day) ? 1 : 0));
    }
    let best = 0;
    let run = 0;
    for (const [week, count] of weeks) {
      if (count >= need) run++;
      else if (week !== thisWeek) run = 0;
      best = Math.max(best, run);
    }
    return best;
  }
  let best = 0;
  let run = 0;
  for (const day of lastDays(today, lookBack)) {
    if (done.has(day)) run++;
    else if (isPlannedOn(habit, day)) run = 0;
    best = Math.max(best, run);
  }
  return best;
}

// The word after a streak's number: weeks for "a few times a week", whose
// streak counts weeks, days for the rest.
export function streakWord(habit: Pick<Habit, "frequencyType">, count: number, inARow = false): string {
  const weeks = habit.frequencyType === "WEEKLY_COUNT";
  if (inARow) return weeks ? (count === 1 ? "week in a row" : "weeks in a row") : count === 1 ? "day in a row" : "days in a row";
  return weeks ? (count === 1 ? "week" : "weeks") : count === 1 ? "day" : "days";
}

// Days where every planned habit was done.
export function perfectDays(habits: Pick<Habit, "id" | "frequencyType" | "weeklyDays" | "createdAt">[], logs: HabitMonthLog[], days: string[]): number {
  return days.filter((day) => {
    const planned = habits.filter((h) => countsOn(h, logs, day));
    return planned.length > 0 && planned.every((h) => logs.some((l) => l.habitId === h.id && l.completed && l.date.slice(0, 10) === day));
  }).length;
}

export interface CalendarCell {
  day: string | null;
}

// A month laid out Saturday-first, with blanks before the 1st and after
// the last day so the grid is whole weeks.
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = `${year}-${pad(month)}-01`;
  const lead = (weekdayOf(first) - WEEK_START + 7) % 7;
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= length; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// A counted habit's day: under 75% of the goal, close, or reached.
export function countTone(value: number, target: number): "low" | "near" | "full" {
  if (target <= 0) return value > 0 ? "full" : "low";
  const ratio = value / target;
  return ratio >= 1 ? "full" : ratio >= 0.75 ? "near" : "low";
}

// adjust (the prayer settings' Hijri adjustment) is -1, 0 or 1: a calendar
// that runs a day later (the moon seen a day later) reads day N as the
// calculated day N - 1.
const hijriDay = (day: string, adjust: number): Date => dayOf(adjust ? shiftDay(day, -adjust) : day);

// Today's Hijri date in the reader's language, built from the parts so
// the era word Intl adds in Bangla never shows.
export function hijriDate(day: string, locale: "en" | "bn", adjust = 0): string {
  const date = hijriDay(day, adjust);
  const tag = locale === "bn" ? "bn-BD" : "en-GB";
  const parts = new Intl.DateTimeFormat(`${tag}-u-ca-islamic-umalqura`, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).formatToParts(date);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return locale === "bn" ? `${pick("day")} ${pick("month")} ${pick("year")} হিজরি` : `${pick("day")} ${pick("month")} ${pick("year")} AH`;
}

// The Hijri year and month (1–12) of a day.
export function hijriParts(day: string, adjust = 0): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura-nu-latn", { timeZone: "UTC", day: "numeric", month: "numeric", year: "numeric" }).formatToParts(hijriDay(day, adjust));
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: num("year"), month: num("month"), day: num("day") };
}

// When the next Ramadan starts (1 Ramadan on the Umm al-Qura calendar): the
// day, its Hijri year and how many days away it is. Today during Ramadan
// gives the current one with 0 days to go.
export function nextRamadan(today: string, adjust = 0): { startsOn: string; year: number; daysToGo: number } {
  const now = hijriParts(today, adjust);
  if (now.month === 9) return { startsOn: shiftDay(today, 1 - now.day), year: now.year, daysToGo: 0 };
  // Scan forward until the calendar reads 1 Ramadan (at most one lunar year).
  for (let i = 1; i <= 360; i++) {
    const day = shiftDay(today, i);
    const h = hijriParts(day, adjust);
    if (h.month === 9 && h.day === 1) return { startsOn: day, year: h.year, daysToGo: i };
  }
  return { startsOn: shiftDay(today, 354), year: now.year + 1, daysToGo: 354 };
}
