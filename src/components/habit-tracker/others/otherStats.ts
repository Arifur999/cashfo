import type { Habit, HabitStat, HabitToday } from "@/lib/api";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "Mon, Wed, Fri" / "3x/week" / "Every day".
export function frequencyLabel(habit: Habit, t: (s: string) => string): string {
  if (habit.frequencyType === "WEEKLY_DAYS") return habit.weeklyDays.map((d) => t(WEEKDAY_SHORT[d])).join(", ") || "--";
  if (habit.frequencyType === "WEEKLY_COUNT") return `${habit.weeklyCount ?? 0}${t("x/week")}`;
  return t("Every day");
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface OtherOverviewStats {
  doneToday: number;
  totalToday: number;
  activeHabits: number;
  bestStreak: number;
  weekPct: number; // this week's overall completion %
}

// Best streak comes from `stats` (every active habit), not `habitsToday`
// (only habits scheduled today) -- a WEEKLY_DAYS habit not due today can
// still hold the longest streak.
export function overviewStats(habitsToday: HabitToday[], activeHabits: Habit[], stats: HabitStat[], weekPct: number): OtherOverviewStats {
  return {
    doneToday: habitsToday.filter((h) => h.todayLog?.completed).length,
    totalToday: habitsToday.length,
    activeHabits: activeHabits.length,
    bestStreak: stats.reduce((max, s) => Math.max(max, s.currentStreak), 0),
    weekPct,
  };
}

export function statFor(stats: HabitStat[], habitId: string): HabitStat | undefined {
  return stats.find((s) => s.habitId === habitId);
}
