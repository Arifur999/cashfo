import type { HabitMonthTracker } from "@/lib/api";

// The tracker with one cell ticked/unticked -- used to layer an optimistic
// tick over the server props (Namaz and Ramadan sheets both do).
export function withCheck(tracker: HabitMonthTracker, day: number, item: string, checked: boolean): HabitMonthTracker {
  const rest = tracker.checks.filter((c) => !(c.day === day && c.item === item));
  return { ...tracker, checks: checked ? [...rest, { day, item }] : rest };
}
