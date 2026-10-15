// The sums behind Habits › To-do list: the day strip, what a day's list
// holds, and what is coming up after it. Pure, so the page and its tests
// agree. A list's `date` is a plain "YYYY-MM-DD".
import type { TodoItem, TodoList } from "./api";
import { formatDate } from "./date";
import { shiftDay } from "./habitDisplay";

// Days shown on the strip before and after the one picked.
export const STRIP_BEFORE = 2;
export const STRIP_AFTER = 6;

export const isDayKey = (value: string | undefined): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));

export const listFor = (lists: TodoList[], day: string): TodoList | null => lists.find((list) => list.date === day) ?? null;

export const openItems = (list: TodoList | null): TodoItem[] => list?.items.filter((item) => !item.completed) ?? [];
export const doneItems = (list: TodoList | null): TodoItem[] => list?.items.filter((item) => item.completed) ?? [];

// The strip of days around the one picked.
export const stripDays = (day: string): string[] => Array.from({ length: STRIP_BEFORE + 1 + STRIP_AFTER }, (_, i) => shiftDay(day, i - STRIP_BEFORE));

export interface DayCount {
  total: number;
  done: number;
}

export const dayCount = (list: TodoList | null): DayCount => ({ total: list?.items.length ?? 0, done: doneItems(list).length });

// What a strip day says under its number: "4 done", "3 of 5", "3 tasks",
// or nothing. Dictionary keys go through `t`.
export function dayCountText(count: DayCount, t: (key: string) => string): string {
  if (count.total === 0) return "";
  if (count.done === count.total) return `${count.total} ${t("done")}`;
  if (count.done > 0) return `${count.done} ${t("of")} ${count.total}`;
  return `${count.total} ${t(count.total === 1 ? "task" : "tasks")}`;
}

// "Today", "Tomorrow", "Yesterday" or nothing, for a heading.
export function relativeName(day: string, today: string): "Today" | "Tomorrow" | "Yesterday" | null {
  if (day === today) return "Today";
  if (day === shiftDay(today, 1)) return "Tomorrow";
  if (day === shiftDay(today, -1)) return "Yesterday";
  return null;
}

// "Friday, 2 Oct" -- the date at UTC midnight is the same calendar day in
// the app's timezone (UTC+6), so it formats like every other date.
export const dayLabel = (day: string, pattern = "EEEE, d MMM"): string => formatDate(`${day}T00:00:00.000Z`, pattern);

export interface Upcoming {
  tomorrow: TodoList | null;
  // Open tasks from the day after tomorrow through a week out, oldest first.
  later: { day: string; item: TodoItem }[];
}

export function upcoming(lists: TodoList[], day: string): Upcoming {
  const tomorrow = listFor(lists, shiftDay(day, 1));
  const from = shiftDay(day, 2);
  const to = shiftDay(day, 7);
  const later = lists
    .filter((list) => list.date >= from && list.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((list) => openItems(list).map((item) => ({ day: list.date, item })));
  return { tomorrow, later };
}

// The lists with one replaced (by id), or added when it is new.
export function withList(lists: TodoList[], list: TodoList): TodoList[] {
  return lists.some((l) => l.id === list.id) ? lists.map((l) => (l.id === list.id ? list : l)) : [...lists, list];
}
