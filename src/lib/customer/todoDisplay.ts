// The To Do List's words: what a day's list holds, priority, repeating
// and moves (the board's own sums are in todoBoard.ts). Pure, so the page and its tests
// agree. A list's `date` is a plain "YYYY-MM-DD".
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { type FormatLocale, langOf } from "@/lib/i18n/formatPrefs";
import { inEnglish, type Translate } from "@/lib/i18n/message";
import type { TodoItem, TodoList, TodoPriority, TodoRepeatRule } from "./api";
import { type DayStyle, dayText, shiftDay, WEEK_ORDER, WEEKDAY_LONG, WEEKDAY_SHORT } from "./habitDisplay";

export const isDayKey = (value: string | undefined): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));

export const listFor = (lists: TodoList[], day: string): TodoList | null => lists.find((list) => list.date === day) ?? null;

export const openItems = (list: TodoList | null): TodoItem[] => list?.items.filter((item) => !item.completed) ?? [];
export const doneItems = (list: TodoList | null): TodoItem[] => list?.items.filter((item) => item.completed) ?? [];

// "3 of 5 done": a day's tasks, as one sentence.
export const doneOfText = (done: number, total: number, t: Translate = inEnglish, locale: FormatLocale = "en"): string =>
  t("{done} of {total} done", { done: formatCount(done, locale), total: formatCount(total, locale) });

// "Friday, 2 Oct" in the reader's language, in any of dayText's styles.
export const dayLabel = (day: string, locale: FormatLocale = "en", style: DayStyle = "long"): string => dayText(day, locale, style);

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
export function dayOfMonthWord(day: number, locale: FormatLocale): string {
  if (langOf(locale) === "bn") return toLocaleDigits(String(day), locale);
  const tens = day % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ?? "th";
  return `${toLocaleDigits(String(day), locale)}${suffix}`;
}

// "Every Friday", "Every day", "Monthly, on the 3rd" -- or, inside a line
// of other details, "every Friday", "every month on the 3rd".
export function repeatLabel(rule: Pick<TodoRepeatRule, "kind" | "weekdays" | "monthDay">, t: Translate, locale: FormatLocale, inLine = false): string {
  if (rule.kind === "DAILY") return t(inLine ? "every day" : "Every day");
  if (rule.kind === "MONTHLY") return t(inLine ? "every month on the {day}" : "Monthly, on the {day}", { day: dayOfMonthWord(rule.monthDay ?? 1, locale) });
  const days = WEEK_ORDER.filter((day) => rule.weekdays.includes(day));
  if (days.length === 7) return t(inLine ? "every day" : "Every day");
  if (days.length === 1) return t(inLine ? "every {day}" : "Every {day}", { day: t(WEEKDAY_LONG[days[0]]) });
  return t(inLine ? "every {days}" : "Every {days}", { days: days.map((day) => t(WEEKDAY_SHORT[day])).join(", ") });
}

// "Moved from yesterday", or the day it was first planned for.
export function movedLabel(movedFrom: string, day: string, t: Translate, locale: FormatLocale = "en"): string {
  return movedFrom === shiftDay(day, -1) ? t("Moved from yesterday") : t("Moved from {date}", { date: dayLabel(movedFrom, locale, "short") });
}
