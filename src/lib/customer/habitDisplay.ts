import { format } from "date-fns";
import { toDateInputValue } from "@/lib/date";
import { banglaDayMonth, banglaShortDay, BN_MONTHS_LONG, BN_MONTHS_SHORT, BN_WEEKDAYS_LONG, toBanglaDigits } from "@/lib/i18n/banglaDates";
import { formatCount } from "@/lib/i18n/digits";
import { inEnglish, type Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
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

// Dictionary keys for the narrow weekday heads, Sunday first. The two-letter
// ones are the date picker's (shared.ts words them রবি, সোম … as the Bangla
// board does); the one-letter ones fit an 18px column, and their Bangla
// (র, সো, ম, বু, বৃ, শু, শ) tells every day apart, which a cut word can't.
export const WEEKDAY_MIN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const WEEKDAY_INITIAL = ["S@@Sunday initial", "M@@Monday initial", "T@@Tuesday initial", "W@@Wednesday initial", "T@@Thursday initial", "F@@Friday initial", "S@@Saturday initial"];
// "{count} of the {total} missed prayers were on {weekday}": a weekday said
// of every week, Sunday first.
export const WEEKDAY_PLURAL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

// The Bangla day and month names come fixed from banglaDates.ts: the
// browser's ICU data words them differently between versions, and the
// server and the hydrating browser must print the same text.
const EN_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// How a day is written: "full" Wednesday, 21 October 2026 · "long"
// Wednesday, 21 Oct · "short" Wed, 21 Oct · "shortYear" Wed, 21 Oct 2026 ·
// "dayMonth" 21 Oct · "dayMonthYear" 21 Oct 2026 · "weekday" Wednesday.
export type DayStyle = "full" | "long" | "short" | "shortYear" | "dayMonth" | "dayMonthYear" | "weekday";

const EN_DAY: Record<DayStyle, string> = {
  full: "EEEE, d MMMM yyyy",
  long: "EEEE, d MMM",
  short: "EEE, d MMM",
  shortYear: "EEE, d MMM yyyy",
  dayMonth: "d MMM",
  dayMonthYear: "d MMM yyyy",
  weekday: "EEEE",
};

// A "YYYY-MM-DD" day in the reader's language. Built from the day's own
// parts, never a timezone, so the server and the browser agree.
export function dayText(day: string, locale: Locale, style: DayStyle = "short"): string {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return day;
  if (locale !== "bn") return format(new Date(year, month - 1, date), EN_DAY[style]);
  const weekday = BN_WEEKDAYS_LONG[new Date(Date.UTC(year, month - 1, date)).getUTCDay()];
  const yearText = toBanglaDigits(year);
  switch (style) {
    case "full":
      return `${weekday}, ${toBanglaDigits(date)} ${BN_MONTHS_LONG[month - 1]} ${yearText}`;
    case "long":
      return `${weekday}, ${banglaDayMonth(day)}`;
    case "short":
      return banglaShortDay(day);
    case "shortYear":
      return `${banglaShortDay(day)} ${yearText}`;
    case "dayMonth":
      return banglaDayMonth(day);
    case "dayMonthYear":
      return `${banglaDayMonth(day)} ${yearText}`;
    case "weekday":
      return weekday;
  }
}

// A moment (createdAt, finishedAt) as its day on the app's calendar.
export const instantText = (iso: string, locale: Locale, style: DayStyle = "dayMonth"): string => dayText(toDateInputValue(iso), locale, style);

// A month's short name (1–12): "Oct", "অক্টো".
export const monthShort = (month: number, locale: Locale): string => (locale === "bn" ? BN_MONTHS_SHORT : EN_MONTHS_SHORT)[month - 1] ?? "";

// Bangla digits typed into a number field ("৩০") read as the number.
export const latinDigits = (text: string): string => text.replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6));

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

const nextMonth = (month: string): string => {
  const [year, number] = month.split("-").map(Number);
  return number === 12 ? `${year + 1}-01` : `${year}-${pad(number + 1)}`;
};
const earlierKey = (a: string, b: string): string => (a < b ? a : b);

// Every month from `from` to `to` ("YYYY-MM"), oldest first.
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  for (let month = from; month <= to; month = nextMonth(month)) months.push(month);
  return months;
}

// The months Daily habits reads logs from ("YYYY-MM", oldest first). For
// the day shown, the ones its week (Saturday to Friday, which can run into
// the next month) and the 30 days up to it reach, from the month before at
// least (a log there can move the day a habit started) and never past
// today's month, where nothing is logged yet. For the side panel's "Best,
// last 60 days", the ones the 60 days up to today reach, whatever the day.
export function dailyLogMonths(day: string, today: string): { dayMonths: string[]; bestMonths: string[] } {
  const todayMonth = today.slice(0, 7);
  const monthBefore = shiftDay(`${day.slice(0, 7)}-01`, -1).slice(0, 7);
  const dayMonths = monthsBetween(earlierKey(monthBefore, shiftDay(day, -29).slice(0, 7)), earlierKey(weekOf(day)[6].slice(0, 7), todayMonth));
  const bestMonths = monthsBetween(shiftDay(today, -59).slice(0, 7), todayMonth);
  return { dayMonths, bestMonths };
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
  // "30 minutes", "8 glasses", or null for a plain tick.
  amount: string | null;
}

// The units the New habit drawer offers as chips. They are saved as these
// English keys, so each one reads in the reader's language; a unit typed by
// hand is shown as typed.
export const HABIT_UNITS = ["minutes", "glasses", "pages", "steps", "times"];

export const unitLabel = (unit: string | null | undefined, t: Translate = inEnglish): string => {
  const typed = unit?.trim() ?? "";
  return HABIT_UNITS.includes(typed) ? t(typed) : typed;
};

// The unit as it is saved: one of the chips' keys when the words typed are
// that chip's, else the words themselves.
export const unitKey = (text: string, t: Translate = inEnglish): string => {
  const typed = text.trim();
  return HABIT_UNITS.find((key) => key === typed || t(key) === typed) ?? typed;
};

// "30 minutes", "১০,০০০ কদম": a counted amount with its unit.
export const amountLabel = (value: number, unit: string | null | undefined, t: Translate = inEnglish, locale: Locale = "en"): string =>
  [formatCount(value, locale), unitLabel(unit, t)].filter(Boolean).join(" ");

// A run of consecutive weekdays reads as a range; anything else lists them.
function daysPhrase(days: number[], t: Translate): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return t("Every day");
  if (sorted.length === 0) return t("No day planned");
  // Rotate so the run can start on Saturday (6) and continue through Sunday.
  const positions = sorted.map((d) => WEEK_ORDER.indexOf(d)).sort((a, b) => a - b);
  const contiguous = positions.every((p, i) => i === 0 || p === positions[i - 1] + 1);
  if (contiguous && sorted.length > 2) return t("{from} to {to}", { from: t(WEEKDAY_LONG[WEEK_ORDER[positions[0]]]), to: t(WEEKDAY_LONG[WEEK_ORDER[positions[positions.length - 1]]]) });
  return positions.map((p) => t(WEEKDAY_SHORT[WEEK_ORDER[p]])).join(", ");
}

// How often a habit is planned and how much it counts, in the reader's
// language (English without a t).
export function ruleLabel(habit: Pick<Habit, "frequencyType" | "weeklyDays" | "weeklyCount" | "targetValue" | "unit">, t: Translate = inEnglish, locale: Locale = "en"): RuleLabel {
  const count = habit.weeklyCount ?? 1;
  const days =
    habit.frequencyType === "DAILY"
      ? t("Every day")
      : habit.frequencyType === "WEEKLY_DAYS"
        ? daysPhrase(habit.weeklyDays, t)
        : t(count === 1 ? "{count} time a week" : "{count} times a week", { count: formatCount(count, locale) });
  const amount = habit.targetValue ? amountLabel(habit.targetValue, habit.unit, t, locale) : null;
  return { days, amount };
}

// The step a counted habit's − and + move by: one for a small goal, a round
// tenth or so of a large one (30 minutes moves by 2, 10,000 steps by 1,000).
const ROUND_STEPS = [1, 2, 5, 10, 15, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000];

export function countStep(target: number): number {
  const tenth = Math.max(1, target / 10);
  return ROUND_STEPS.filter((step) => step <= tenth).pop() ?? 1;
}

// The quick "+5", "+10" an amount field offers: round amounts between a
// tenth and a half of the goal, at most two (none for a goal of one).
export function quickAmounts(target: number): number[] {
  return ROUND_STEPS.filter((amount) => amount >= target / 10 && amount <= target / 2).slice(0, 2);
}

// The largest amount a day can be given, so a slip of the finger can't send
// a number the server's column can't hold.
export const MAX_AMOUNT = 999_999;

// What was typed into an amount field ("৩০" or "30"), or null when it isn't
// a whole number in range.
export function parseAmount(text: string): number | null {
  const digits = latinDigits(text.trim());
  if (!/^\d+$/.test(digits)) return null;
  const value = Number(digits);
  return value <= MAX_AMOUNT ? value : null;
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

// The same with its number, as one sentence: "5 days", "2 weeks in a row".
export function streakText(habit: Pick<Habit, "frequencyType">, count: number, t: Translate = inEnglish, locale: Locale = "en", inARow = false): string {
  return t(`{count} ${streakWord(habit, count, inARow)}`, { count: formatCount(count, locale) });
}

// "5 days": a plain count of days, in the reader's digits.
export const daysText = (count: number, t: Translate = inEnglish, locale: Locale = "en"): string => t(count === 1 ? "{count} day" : "{count} days", { count: formatCount(count, locale) });

// A backend refusal in the reader's language. Most are fixed sentences the
// dictionaries word; the ones carrying a name or a number are matched here,
// and anything unknown (a network error's English) is shown as it came.
const REFUSALS: { pattern: RegExp; key: string; values: (match: RegExpMatchArray, locale: Locale) => Record<string, string> }[] = [
  { pattern: /^"(.+)" is already on this sheet$/, key: '"{name}" is already on this sheet', values: (m) => ({ name: m[1] }) },
  { pattern: /^A sheet can have at most (\d+) habits$/, key: "A sheet can have at most {count} rows", values: (m, locale) => ({ count: formatCount(Number(m[1]), locale) }) },
  { pattern: /^A list can have at most (\d+) tasks$/, key: "A list can have at most {count} tasks", values: (m, locale) => ({ count: formatCount(Number(m[1]), locale) }) },
  { pattern: /^That day's list already has (\d+) tasks$/, key: "That day's list already has {count} tasks", values: (m, locale) => ({ count: formatCount(Number(m[1]), locale) }) },
  { pattern: /^This book has (\d+) pages$/, key: "This book has {count} pages", values: (m, locale) => ({ count: formatCount(Number(m[1]), locale) }) },
  { pattern: /^A course can have up to (\d+) lessons$/, key: "A course can have up to {count} lessons", values: (m, locale) => ({ count: formatCount(Number(m[1]), locale) }) },
  { pattern: /^A goal can be up to (\d+) hours$/, key: "A goal can be up to {count} hours", values: (m, locale) => ({ count: formatCount(Number(m[1]), locale) }) },
  { pattern: /^Ramadan (\d+) already exists$/, key: "Ramadan {year} already has a sheet", values: (m, locale) => ({ year: locale === "bn" ? toBanglaDigits(m[1]) : m[1] }) },
  { pattern: /^A Namaz tracker for (\d+)\/(\d+) already exists$/, key: "That month already has a sheet", values: () => ({}) },
  // How many of a thing one person can keep.
  { pattern: /^You can keep up to (\d+) challenges$/, key: "You can keep up to {count} challenges", values: (m, locale) => ({ count: formatCount(Number(m[1]), locale) }) },
  { pattern: /^You can keep up to (\d+) books$/, key: "You can keep up to {count} books", values: (m, locale) => ({ count: formatCount(Number(m[1]), locale) }) },
  { pattern: /^You can keep up to (\d+) skills$/, key: "You can keep up to {count} skills", values: (m, locale) => ({ count: formatCount(Number(m[1]), locale) }) },
  { pattern: /^You can keep at most (\d+) to-do lists\. Delete some old ones first\.$/, key: "You can keep at most {count} to-do lists. Delete some old ones first.", values: (m, locale) => ({ count: formatCount(Number(m[1]), locale) }) },
  { pattern: /^You can keep at most (\d+) repeating tasks\.$/, key: "You can keep at most {count} repeating tasks.", values: (m, locale) => ({ count: formatCount(Number(m[1]), locale) }) },
  // The server's limit of 100 requests a minute, which clears within a minute.
  { pattern: /^ThrottlerException: Too Many Requests$/, key: "Too many changes at once. Wait a minute and try again.", values: () => ({}) },
];

export function actionError(message: string | undefined, fallback: string, t: Translate = inEnglish, locale: Locale = "en"): string {
  const text = message?.trim() || fallback;
  for (const refusal of REFUSALS) {
    const match = text.match(refusal.pattern);
    if (match) return t(refusal.key, refusal.values(match, locale));
  }
  return t(text);
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
