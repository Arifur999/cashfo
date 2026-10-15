// The sums behind Habits › Today: the week of prayers from the Namaz
// sheets, the last seven days of prayers and habits side by side, and the
// streaks worth showing. Pure, so the page and its tests agree.
import type { Habit, HabitMonthLog, HabitMonthTracker, HabitToday } from "./api";
import { countsOn, dayMark, isPlannedOn, lastDays, shiftDay } from "./habitDisplay";
import { cellState, PRAYERS, trackerFor } from "./namazDisplay";

// prayed / missed / open (today, not yet) / none (no sheet, or not reached).
export type PrayerMark = "prayed" | "missed" | "open" | "none";

export function prayerMarks(trackers: HabitMonthTracker[], day: string, today: string): PrayerMark[] {
  if (day > today) return PRAYERS.map(() => "none");
  const [year, month] = day.split("-").map(Number);
  const tracker = trackerFor(trackers, year, month);
  if (!tracker) return PRAYERS.map(() => (day === today ? "open" : "none"));
  const dayNumber = Number(day.slice(8));
  return PRAYERS.map((prayer) => {
    const state = cellState(tracker, dayNumber, prayer);
    return state === "locked" ? "none" : state;
  });
}

export const prayedOn = (trackers: HabitMonthTracker[], day: string, today: string): number => prayerMarks(trackers, day, today).filter((mark) => mark === "prayed").length;

// Days in a row with all five prayed: through today when today is complete,
// otherwise through yesterday.
export function prayerStreak(trackers: HabitMonthTracker[], today: string, lookBack = 365): number {
  let day = prayedOn(trackers, today, today) === PRAYERS.length ? today : shiftDay(today, -1);
  let streak = 0;
  while (streak < lookBack && prayedOn(trackers, day, today) === PRAYERS.length) {
    streak++;
    day = shiftDay(day, -1);
  }
  return streak;
}

export interface DayBars {
  day: string;
  prayed: number;
  habitsDone: number;
  habitsDue: number;
}

// Prayers prayed and habits done, for each of the last seven days.
export function last7(trackers: HabitMonthTracker[], habits: Habit[], logs: HabitMonthLog[], today: string): DayBars[] {
  const active = habits.filter((habit) => !habit.isArchived);
  return lastDays(today, 7).map((day) => ({
    day,
    prayed: prayedOn(trackers, day, today),
    habitsDue: active.filter((habit) => countsOn(habit, logs, day)).length,
    habitsDone: active.filter((habit) => dayMark(habit, logs, day, today) === "done").length,
  }));
}

export interface FullDays {
  days: number;
  prayed: number;
  prayersDue: number;
  habitsDone: number;
  habitsDue: number;
}

// The totals over the days that are over (every day but today).
export function fullDays(bars: DayBars[]): FullDays {
  const past = bars.slice(0, -1);
  return past.reduce((sum, bar) => ({ days: sum.days + 1, prayed: sum.prayed + bar.prayed, prayersDue: sum.prayersDue + PRAYERS.length, habitsDone: sum.habitsDone + bar.habitsDone, habitsDue: sum.habitsDue + bar.habitsDue }), { days: 0, prayed: 0, prayersDue: 0, habitsDone: 0, habitsDue: 0 });
}

export const pct = (done: number, due: number): number => (due > 0 ? Math.round((done / due) * 100) : 0);

export interface StreakRow {
  key: string;
  kind: "habit" | "skills" | "prayers";
  name: string;
  days: number;
  // The habit's own icon and colour keys; the other kinds have fixed looks.
  icon?: string;
  color?: string;
}

// Every streak that is alive, longest first, at most `limit` of them.
export function streakRows(rows: HabitToday[], skillsStreak: number, prayers: number, limit = 6): StreakRow[] {
  const list: StreakRow[] = rows.filter((row) => row.streak > 0).map((row) => ({ key: row.id, kind: "habit", name: row.name, days: row.streak, icon: row.icon, color: row.color }));
  if (skillsStreak > 0) list.push({ key: "skills", kind: "skills", name: "Skills practice", days: skillsStreak });
  if (prayers > 0) list.push({ key: "prayers", kind: "prayers", name: "All five prayers", days: prayers });
  return list.sort((a, b) => b.days - a.days).slice(0, limit);
}

// The active habits not planned for today.
export const restingToday = (habits: Habit[], today: string): Habit[] => habits.filter((habit) => !habit.isArchived && !isPlannedOn(habit, today));

export const doneToday = (rows: HabitToday[]): number => rows.filter((row) => row.todayLog?.completed).length;
