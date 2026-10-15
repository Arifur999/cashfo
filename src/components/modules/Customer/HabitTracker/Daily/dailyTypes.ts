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
  // The viewed month's logs and the month before, so a week and the last
  // 30 days always have their logs.
  logs: HabitMonthLog[];
}
