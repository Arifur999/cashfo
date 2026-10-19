import type { HabitMonthTracker, PrayerStatus } from "@/lib/customer/api";

// The tracker with one cell marked or cleared -- used to layer an optimistic
// mark over the server props (Namaz and Ramadan sheets both do). A Namaz mark
// carries how the prayer was prayed.
export function withCheck(tracker: HabitMonthTracker, day: number, item: string, checked: boolean, status: PrayerStatus = "ON_TIME"): HabitMonthTracker {
  const rest = tracker.checks.filter((c) => !(c.day === day && c.item === item));
  return { ...tracker, checks: checked ? [...rest, { day, item, status }] : rest };
}
