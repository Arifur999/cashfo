// The sums behind Habits › To-do list: the day strip, what a day's list
// holds, and what is coming up after it. Pure, so the page and its tests
// agree. A list's `date` is a plain "YYYY-MM-DD".
import type { Locale } from "@/lib/i18n/translate";
import type { Translate } from "@/lib/i18n/message";
import type { TodoItem, TodoList, TodoPriority, TodoRepeatRule } from "./api";
import { formatDate } from "./date";
import { shiftDay, WEEK_ORDER, WEEKDAY_LONG, WEEKDAY_SHORT } from "./habitDisplay";

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

// Priority, time and repeating: how a task's extras read on the board.
export const PRIORITIES: TodoPriority[] = ["HIGH", "MEDIUM", "LOW"];

// Dictionary keys.
export const PRIORITY_LABEL: Record<TodoPriority, string> = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };

const PRIORITY_RANK: Record<TodoPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

// High priority first, then by time (a task with no time after the timed
// ones), then in the order they were added.
export const byPriority = (items: TodoItem[]): TodoItem[] =>
  [...items].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99"));

// "3rd" in English; Bangla writes the plain number ("৩ তারিখে").
export function dayOfMonthWord(day: number, locale: Locale): string {
  if (locale === "bn") return String(day);
  const tens = day % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ?? "th";
  return `${day}${suffix}`;
}

// "Every Friday", "Every day", "Monthly, on the 3rd" -- or, inside a line
// of other details, "every Friday", "every month on the 3rd".
export function repeatLabel(rule: Pick<TodoRepeatRule, "kind" | "weekdays" | "monthDay">, t: Translate, locale: Locale, inLine = false): string {
  if (rule.kind === "DAILY") return t(inLine ? "every day" : "Every day");
  if (rule.kind === "MONTHLY") return t(inLine ? "every month on the {day}" : "Monthly, on the {day}", { day: dayOfMonthWord(rule.monthDay ?? 1, locale) });
  const days = WEEK_ORDER.filter((day) => rule.weekdays.includes(day));
  if (days.length === 7) return t(inLine ? "every day" : "Every day");
  if (days.length === 1) return t(inLine ? "every {day}" : "Every {day}", { day: t(WEEKDAY_LONG[days[0]]) });
  return t(inLine ? "every {days}" : "Every {days}", { days: days.map((day) => t(WEEKDAY_SHORT[day])).join(", ") });
}

// "Moved from yesterday", or the day it was first planned for.
export function movedLabel(movedFrom: string, day: string, t: Translate): string {
  return movedFrom === shiftDay(day, -1) ? t("Moved from yesterday") : t("Moved from {date}", { date: dayLabel(movedFrom, "EEE d MMM") });
}
