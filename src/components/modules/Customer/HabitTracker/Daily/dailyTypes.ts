import type { Habit, HabitMonthLog, HabitStat, HabitToday } from "@/lib/customer/api";

// What the Daily habits page is told by its server page.
export interface DailyHabitsData {
  today: string;
  // The day being viewed, today or earlier.
  day: string;
  // Every habit, archived ones included.
  habits: Habit[];
  // Today's planned habits with their logs, from /api/habits/today.
  todayRows: HabitToday[];
  stats: HabitStat[];
  // Every month the day's views reach (its week, which can run into the
  // next month, and the 30 days up to it), from the month before it at
  // least, so a week and the last 30 days always have their logs.
  logs: HabitMonthLog[];
  // "YYYY-MM": the month the side panel shows (?month=, else the day's),
  // and the logs it is drawn from.
  panelMonth: string;
  panelLogs: HabitMonthLog[];
  // The months the 60 days up to today reach, for the panel's best streak,
  // whatever day is shown.
  bestLogs: HabitMonthLog[];
}
