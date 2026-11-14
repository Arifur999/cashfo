// The sums behind the To Do List board (TodoBoard): every task with its
// day, the lists they are filed under, overdue and Someday, the time-of-day
// groups, the week, the streak and the side cards. Pure, so the page and its
// tests agree. Days are plain "YYYY-MM-DD" keys on the app's calendar.
import { formatDay, toDateInputValue } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import { inEnglish, type Translate } from "@/lib/i18n/message";
import type { TodoCategory, TodoColor, TodoItem, TodoList, TodoPriority, TodoRepeatRule } from "./api";
import { dayText, shiftDay, weekdayOf, weekOf } from "./habitDisplay";

// One task with where it sits: its day's list, or Someday (day null).
export interface BoardTask {
  item: TodoItem;
  listId: string;
  day: string | null;
}

export const boardTasks = (lists: TodoList[]): BoardTask[] => lists.flatMap((list) => list.items.map((item) => ({ item, listId: list.id, day: list.date })));

export const somedayList = (lists: TodoList[]): TodoList | null => lists.find((list) => list.date === null) ?? null;

const RANK: Record<TodoPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

// The board's order: by day (Someday last), high priority first, then by
// time (no time after the timed ones); otherwise as they were added.
export function compareTasks(a: BoardTask, b: BoardTask): number {
  const dayA = a.day ?? "9";
  const dayB = b.day ?? "9";
  if (dayA !== dayB) return dayA < dayB ? -1 : 1;
  return RANK[a.item.priority] - RANK[b.item.priority] || (a.item.dueTime ?? "99").localeCompare(b.item.dueTime ?? "99");
}

export const sortTasks = (tasks: BoardTask[]): BoardTask[] => [...tasks].sort(compareTasks);

// Morning before noon, afternoon until five, evening after; untimed last.
export type TimeSlot = "am" | "pm" | "eve" | "any";
export const TIME_SLOTS: { key: TimeSlot; label: string }[] = [
  { key: "am", label: "Morning" },
  { key: "pm", label: "Afternoon" },
  { key: "eve", label: "Evening" },
  { key: "any", label: "Any time" },
];

export function slotOf(dueTime: string | null): TimeSlot {
  if (!dueTime) return "any";
  const hour = Number(dueTime.slice(0, 2));
  return hour < 12 ? "am" : hour < 17 ? "pm" : "eve";
}

// The quick add's and the popup's times: every 15 minutes, by part of the
// day, from 5 am round to the small hours. A time already set that isn't on
// the grid (10:05) joins its part of the day.
export const TIME_GROUPS: { label: string; from: number; to: number }[] = [
  { label: "Morning", from: 5, to: 12 },
  { label: "Afternoon", from: 12, to: 17 },
  { label: "Evening", from: 17, to: 24 },
  { label: "Late night", from: 0, to: 5 },
];

export function timeChoices(current: string | null): { label: string; times: string[] }[] {
  return TIME_GROUPS.map((group) => {
    const times: string[] = [];
    for (let hour = group.from; hour < group.to; hour++) for (let minute = 0; minute < 60; minute += 15) times.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    if (current && !times.includes(current)) {
      const hour = Number(current.slice(0, 2));
      if (hour >= group.from && hour < group.to) {
        times.push(current);
        times.sort();
      }
    }
    return { label: group.label, times };
  });
}

// ---- Lists (categories) ----

// Built-in lists' names, as dictionary keys (the context keeps "Home" the
// list apart from Home the page).
export const BUILT_IN_NAMES: Record<NonNullable<TodoCategory["key"]>, string> = { personal: "Personal@@todo list", work: "Work@@todo list", home: "Home@@todo list", deen: "Deen@@todo list" };

export const listName = (category: TodoCategory, t: Translate = inEnglish): string => (category.key ? t(BUILT_IN_NAMES[category.key]) : category.name);

// The list a task is filed under: its own, or Personal when it has none
// (or its list was deleted).
export function categoryOf(item: Pick<TodoItem, "categoryId">, categories: TodoCategory[]): TodoCategory | null {
  return categories.find((category) => category.id === item.categoryId) ?? categories.find((category) => category.key === "personal") ?? categories[0] ?? null;
}

export const inCategory = (item: Pick<TodoItem, "categoryId">, categories: TodoCategory[], filter: string | null): boolean => !filter || categoryOf(item, categories)?.id === filter;

// The colours a new list is offered, in the order they are handed out.
export const NEW_LIST_COLORS: TodoColor[] = ["pink", "teal", "yellow", "indigo", "emerald", "purple"];

export const nextListColor = (categories: TodoCategory[]): TodoColor => NEW_LIST_COLORS[categories.filter((category) => category.key === null).length % NEW_LIST_COLORS.length];

// A name already taken, in either language (Work and অফিস are the same list).
export function listNameTaken(name: string, categories: TodoCategory[], t: Translate): boolean {
  const wanted = name.trim().toLocaleLowerCase();
  return categories.some((category) => category.name.toLocaleLowerCase() === wanted || listName(category, t).toLocaleLowerCase() === wanted);
}

// ---- Search ----

export function matchesSearch(item: Pick<TodoItem, "text" | "note" | "steps">, query: string): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  const has = (text: string) => text.toLocaleLowerCase().includes(q);
  return has(item.text) || has(item.note) || item.steps.some((step) => has(step.text));
}

// ---- Days ----

export const isOverdue = (task: BoardTask, today: string): boolean => task.day !== null && task.day < today && !task.item.completed;

// Days shown on the strip before and after the one it is anchored on.
export const STRIP_BEFORE = 2;
export const STRIP_AFTER = 6;

// The nine days on the strip, two before the anchor; the anchor follows the
// picked day once it leaves the strip.
export function stripAnchor(anchor: string, picked: string): string {
  return picked < shiftDay(anchor, -STRIP_BEFORE) || picked > shiftDay(anchor, STRIP_AFTER) ? picked : anchor;
}

export const stripDays = (anchor: string): string[] => Array.from({ length: STRIP_BEFORE + 1 + STRIP_AFTER }, (_, i) => shiftDay(anchor, i - STRIP_BEFORE));

// "Today", "Tomorrow", "Yesterday" or nothing.
export function relativeWord(day: string, today: string): "Today" | "Tomorrow" | "Yesterday" | null {
  if (day === today) return "Today";
  if (day === shiftDay(today, 1)) return "Tomorrow";
  if (day === shiftDay(today, -1)) return "Yesterday";
  return null;
}

// A task's day in a few words: Someday, Today, Tomorrow, Yesterday or "Fri, 14 Nov".
export function dayWord(day: string | null, today: string, t: Translate, fmt: FormatLocale): string {
  if (!day) return t("Someday");
  const word = relativeWord(day, today);
  return word ? t(word) : dayText(day, fmt, "short");
}

// "8 to 14 November 2026", "29 November to 5 December 2026", or across a
// new year in full, as the TodoBoard board writes a week.
export function rangeText(from: string, to: string, t: Translate, fmt: FormatLocale): string {
  if (from.slice(0, 4) !== to.slice(0, 4)) return t("{from} to {to}", { from: formatDay(from, "d MMMM yyyy", fmt), to: formatDay(to, "d MMMM yyyy", fmt) });
  if (from.slice(5, 7) !== to.slice(5, 7)) return t("{from} to {to}", { from: formatDay(from, "d MMMM", fmt), to: formatDay(to, "d MMMM yyyy", fmt) });
  return t("{from} to {to}", { from: formatCount(Number(from.slice(8, 10)), fmt), to: formatDay(to, "d MMMM yyyy", fmt) });
}

// The week a day falls in, from the reader's first day of the week.
export const weekDays = (day: string, fmt: FormatLocale): string[] => weekOf(day, fmt);

// The next day after `day` a repeating task lands on.
export function nextOnRule(rule: Pick<TodoRepeatRule, "kind" | "weekdays" | "monthDay">, day: string): string {
  if (rule.kind === "DAILY") return shiftDay(day, 1);
  if (rule.kind === "WEEKLY") {
    for (let i = 1; i <= 7; i++) if (rule.weekdays.includes(weekdayOf(shiftDay(day, i)))) return shiftDay(day, i);
    return shiftDay(day, 7);
  }
  const want = rule.monthDay ?? Number(day.slice(8, 10));
  let year = Number(day.slice(0, 4));
  let month = Number(day.slice(5, 7));
  const onMonth = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}-${String(Math.min(want, new Date(Date.UTC(y, m, 0)).getUTCDate())).padStart(2, "0")}`;
  let next = onMonth(year, month);
  if (next <= day) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    next = onMonth(year, month);
  }
  return next;
}

// Days in a row, up to today, with at least one task ticked off; a day
// with none yet today doesn't break it until the day is over.
export function doneStreak(items: Pick<TodoItem, "completed" | "completedAt">[], today: string): number {
  const days = new Set(items.flatMap((item) => (item.completed && item.completedAt ? [toDateInputValue(item.completedAt)] : [])));
  let day = days.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (days.has(day) && streak < 1000) {
    streak += 1;
    day = shiftDay(day, -1);
  }
  return streak;
}

// The rules each day already has a copy of: a repeating task's copy can't
// be moved onto a day its rule covers.
export function rulesByDay(tasks: BoardTask[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const task of tasks) {
    if (!task.day || !task.item.repeat) continue;
    const set = map.get(task.day) ?? new Set<string>();
    set.add(task.item.repeat.id);
    map.set(task.day, set);
  }
  return map;
}

export const canMoveTo = (task: BoardTask, to: string | null, rules: Map<string, Set<string>>): boolean =>
  !task.item.completed && task.day !== to && !(to && task.item.repeat && rules.get(to)?.has(task.item.repeat.id));

// Where a row's one-tap move sends it: Someday and past days to today
// (Someday offers tomorrow too), today to tomorrow, a later day on a day.
export function quickMoves(day: string | null, today: string): { key: "today" | "tomorrow" | "next"; to: string }[] {
  const tomorrow = shiftDay(today, 1);
  if (day === null) return [{ key: "today", to: today }, { key: "tomorrow", to: tomorrow }];
  if (day < today) return [{ key: "today", to: today }];
  if (day === today) return [{ key: "tomorrow", to: tomorrow }];
  return [{ key: "next", to: shiftDay(day, 1) }];
}

// Where "Move all" sends a day's open tasks: a past day's to today, today's
// to tomorrow, a later day's to the day after.
export const moveAllTarget = (day: string, today: string): string => (day < today ? today : shiftDay(day, 1));

// The chip on an open task that was put off: three times or more in red,
// else where it came from.
export function movedChip(item: Pick<TodoItem, "completed" | "moveCount" | "movedFrom">, day: string | null, today: string, t: Translate, fmt: FormatLocale): { text: string; strong: boolean } | null {
  if (item.completed || item.moveCount <= 0 || (day !== null && day < today)) return null;
  if (item.moveCount >= 3) return { text: t("Moved {count} times", { count: formatCount(item.moveCount, fmt) }), strong: true };
  if (!item.movedFrom) return null;
  if (day === today && item.movedFrom === shiftDay(today, -1)) return { text: t("Moved from yesterday"), strong: false };
  return { text: t("Moved from {date}", { date: dayText(item.movedFrom, fmt, "dayMonth") }), strong: false };
}

// The red chip on an overdue task: since when it is waiting.
export function lateChip(task: BoardTask, today: string, t: Translate, fmt: FormatLocale): string | null {
  if (!isOverdue(task, today) || !task.day) return null;
  return task.day === shiftDay(today, -1) ? t("From yesterday") : t("Since {date}", { date: dayText(task.day, fmt, "dayMonth") });
}

export const stepCount = (item: Pick<TodoItem, "steps">): { done: number; total: number } => ({ done: item.steps.filter((step) => step.done).length, total: item.steps.length });

// "3 tasks" in the reader's digits.
export const tasksText = (count: number, t: Translate, fmt: FormatLocale): string => t(count === 1 ? "{count} task" : "{count} tasks", { count: formatCount(count, fmt) });

// "2 of 5" (a day's ticks).
export const ofText = (done: number, total: number, t: Translate, fmt: FormatLocale): string => t("{done} of {total}", { done: formatCount(done, fmt), total: formatCount(total, fmt) });

export const percent = (done: number, total: number): number => (total > 0 ? Math.round((done / total) * 100) : 0);
