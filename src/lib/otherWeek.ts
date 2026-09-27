// Server-side composition for the Others page's week chart -- pure functions,
// no "use client", so habits/page.tsx (a Server Component) can call this
// directly instead of shipping the raw month logs to the browser.
import type { Habit, HabitMonthLogs } from "./api";

export interface OtherWeekDay {
  date: string; // 'YYYY-MM-DD' (UTC, matching the rest of the generic Habit system)
  scheduled: number;
  completed: number;
  pct: number;
}

// Whole days since 1970-01-01 (UTC) -- consistent with the generic Habit
// system's own plain-UTC "today" convention (unlike Book/Skill's Asia/Dhaka).
function utcDateKey(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

// DAILY and WEEKLY_COUNT are always "scheduled" (the same approximation the
// existing Calendar heatmap and getToday() already make -- a WEEKLY_COUNT
// habit's "N times a week" has no fixed day, so every day counts as a chance
// to do it); WEEKLY_DAYS only on a matching weekday.
function isScheduledOn(habit: Habit, dow: number): boolean {
  return habit.frequencyType !== "WEEKLY_DAYS" || habit.weeklyDays.includes(dow);
}

// The last 7 UTC days (oldest first, ending today) of scheduled-vs-completed
// counts for a set of active habits, built from one or two months of
// `getHabitMonthLogs` (two only when today is early enough in the month that
// the 7-day window reaches into the previous one).
export function buildOtherWeek(habits: Habit[], currentMonth: HabitMonthLogs, previousMonth: HabitMonthLogs | null): OtherWeekDay[] {
  const completedByDate = new Map<string, Set<string>>(); // dateKey -> habitIds completed that day
  for (const month of previousMonth ? [previousMonth, currentMonth] : [currentMonth]) {
    for (const log of month.logs) {
      if (!log.completed) continue;
      const key = new Date(log.date).toISOString().slice(0, 10);
      const set = completedByDate.get(key) ?? new Set<string>();
      set.add(log.habitId);
      completedByDate.set(key, set);
    }
  }

  const week: OtherWeekDay[] = [];
  for (let n = 6; n >= 0; n--) {
    const date = utcDateKey(n);
    const dow = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const scheduledHabits = habits.filter((h) => isScheduledOn(h, dow));
    const completedIds = completedByDate.get(date) ?? new Set<string>();
    const completed = scheduledHabits.filter((h) => completedIds.has(h.id)).length;
    const scheduled = scheduledHabits.length;
    week.push({ date, scheduled, completed, pct: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0 });
  }
  return week;
}

export function weekCompletionPct(week: OtherWeekDay[]): number {
  const scheduled = week.reduce((sum, d) => sum + d.scheduled, 0);
  if (scheduled === 0) return 0;
  const completed = week.reduce((sum, d) => sum + d.completed, 0);
  return Math.round((completed / scheduled) * 100);
}

// "YYYY-MM" of `date`, and the one before it -- UTC, matching getMonthLogs'
// own `${month}-01` parsing.
export function monthKeys(date: Date): { current: string; needsPrevious: boolean; previous: string } {
  const current = date.toISOString().slice(0, 7);
  const prevDate = new Date(date);
  prevDate.setUTCMonth(prevDate.getUTCMonth() - 1);
  return { current, needsPrevious: date.getUTCDate() <= 6, previous: prevDate.toISOString().slice(0, 7) };
}
