import { formatCount } from "@/lib/i18n/digits";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import type { Translate } from "@/lib/i18n/message";
import type { OffsetReminderKind, Reminder, ReminderInput, ReminderKind, SavedReminderKind, TimedReminderKind } from "./api";
import { timeLabel } from "./date";
import { daysPhrase } from "./habitDisplay";

// The rules and words behind habit reminders (the editor, Settings › App's
// list and the bell). Pure, so the tests pin them down.

export const MAX_REMINDER_TIMES = 6;
// The "minutes before" choices for a prayer, Sehri, Iftar or a to-do.
export const MINUTES_BEFORE_CHOICES = [0, 5, 10, 15, 30, 60] as const;
export const DEFAULT_REMINDER_TIME = "08:00";
export const DEFAULT_MINUTES_BEFORE = 10;

// The keys NAMAZ and RAMADAN reminders are saved under, and their words.
export const NAMAZ_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export const RAMADAN_KEYS = ["sehri", "iftar"] as const;
export type NamazKey = (typeof NAMAZ_KEYS)[number];
export type RamadanKey = (typeof RAMADAN_KEYS)[number];
export const PRAYER_LABEL: Record<NamazKey, string> = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };
export const RAMADAN_LABEL: Record<RamadanKey, string> = { sehri: "Sehri ends", iftar: "Iftar" };

const REMINDER_KINDS: readonly string[] = ["HABIT", "CHALLENGE", "TODO", "NAMAZ", "RAMADAN", "BOOK", "SKILL"];
export const isReminderKind = (value: unknown): value is ReminderKind => typeof value === "string" && REMINDER_KINDS.includes(value);
export const isTimedKind =(kind: ReminderKind): kind is TimedReminderKind => kind === "HABIT" || kind === "CHALLENGE" || kind === "BOOK" || kind === "SKILL";
export const isOffsetKind = (kind: ReminderKind): kind is OffsetReminderKind => kind === "NAMAZ" || kind === "RAMADAN";

// What the editor holds while it is changed. A timed reminder uses times and
// weekdays, a prayer's uses minutesBefore; the other fields ride along.
export interface ReminderDraft {
  enabled: boolean;
  times: string[];
  // 0 = Sunday ... 6 = Saturday; empty = every day.
  weekdays: number[];
  minutesBefore: number;
}

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isClock = (value: string) => CLOCK.test(value);

const toMinutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
const toClock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// Valid "HH:MM" times, each once, earliest first, at most six.
export function normalizeTimes(times: string[]): string[] {
  return [...new Set(times.filter(isClock))].sort().slice(0, MAX_REMINDER_TIMES);
}

// Weekdays 0-6, each once, in order. All seven is the same as none: every day.
export function normalizeWeekdays(days: number[]): number[] {
  const unique = [...new Set(days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);
  return unique.length === 7 ? [] : unique;
}

// The time a new row starts at: an hour after the latest, else the next free
// hour from 6 am; null when six are set (or, in theory, no hour is free).
export function nextReminderTime(times: string[], fallback = DEFAULT_REMINDER_TIME): string | null {
  const taken = normalizeTimes(times);
  if (taken.length >= MAX_REMINDER_TIMES) return null;
  if (taken.length === 0) return fallback;
  const later = toMinutes(taken[taken.length - 1]) + 60;
  if (later < 24 * 60 && !taken.includes(toClock(later))) return toClock(later);
  for (let hour = 6; hour < 30; hour += 1) {
    const clock = toClock((hour % 24) * 60);
    if (!taken.includes(clock)) return clock;
  }
  return null;
}

// The editor's starting state: the saved reminder, or an unsaved one that is off.
export function draftFromReminder(kind: SavedReminderKind, reminder: Reminder | null | undefined, defaultTime = DEFAULT_REMINDER_TIME): ReminderDraft {
  if (!reminder) return { enabled: false, times: isTimedKind(kind) ? [defaultTime] : [], weekdays: [], minutesBefore: isOffsetKind(kind) ? DEFAULT_MINUTES_BEFORE : 0 };
  return {
    enabled: reminder.enabled,
    times: reminder.times.length > 0 ? [...reminder.times] : isTimedKind(kind) ? [defaultTime] : [],
    weekdays: [...reminder.weekdays],
    minutesBefore: reminder.minutesBefore,
  };
}

// PUT /api/reminders's body for a draft: only the fields its kind uses.
export function reminderInput(kind: SavedReminderKind, targetKey: string, draft: ReminderDraft): ReminderInput {
  if (isOffsetKind(kind)) return { kind, targetKey, enabled: draft.enabled, minutesBefore: Math.max(0, Math.min(120, Math.round(draft.minutesBefore))) };
  return { kind, targetKey, enabled: draft.enabled, times: normalizeTimes(draft.times), weekdays: normalizeWeekdays(draft.weekdays) };
}

// "At the time", "10 min before".
export function minutesBeforeLabel(minutes: number, t: Translate, locale: FormatLocale = "en"): string {
  return minutes <= 0 ? t("At the time") : t("{count} min before", { count: formatCount(minutes, locale) });
}

// "Every day", "Sunday to Thursday", "Sat, Mon".
export function weekdaysLabel(days: number[], t: Translate): string {
  const each = normalizeWeekdays(days);
  return each.length === 0 ? t("Every day") : daysPhrase(each, t);
}

// When it goes off, in words: "7:00 am, 9:00 pm · Every day", "10 min before".
export function reminderSummary(reminder: Pick<Reminder, "kind" | "times" | "weekdays" | "minutesBefore">, t: Translate, locale: FormatLocale = "en"): string {
  if (isOffsetKind(reminder.kind)) return minutesBeforeLabel(reminder.minutesBefore, t, locale);
  const times = normalizeTimes(reminder.times).map((time) => timeLabel(time, t, locale));
  return [times.join(", "), weekdaysLabel(reminder.weekdays, t)].filter(Boolean).join(" · ");
}

// Each kind's name on its own, as the Settings list labels a row.
export const REMINDER_KIND_LABEL: Record<ReminderKind, string> = {
  HABIT: "Daily habit",
  CHALLENGE: "Challenge",
  TODO: "To-do",
  NAMAZ: "Namaz",
  RAMADAN: "Ramadan",
  BOOK: "Book",
  SKILL: "Skill",
};

// For a habit, challenge, book or skill whose name couldn't be read.
const UNNAMED: Record<TimedReminderKind, string> = { HABIT: "A habit", CHALLENGE: "A challenge", BOOK: "A book", SKILL: "A skill" };

// What a reminder is about: the prayer, Sehri or Iftar, or the habit,
// challenge, book or skill by its name (from `names`, by id).
export function reminderTargetName(kind: SavedReminderKind, targetKey: string, names: Record<string, string>, t: Translate): string {
  if (kind === "NAMAZ") return Object.hasOwn(PRAYER_LABEL, targetKey) ? t(PRAYER_LABEL[targetKey as NamazKey]) : targetKey;
  if (kind === "RAMADAN") return Object.hasOwn(RAMADAN_LABEL, targetKey) ? t(RAMADAN_LABEL[targetKey as RamadanKey]) : targetKey;
  return Object.hasOwn(names, targetKey) && names[targetKey] ? names[targetKey] : t(UNNAMED[kind]);
}

// Where each kind is set: the page its editor is on.
export function reminderHref(kind: ReminderKind, targetKey: string): string {
  switch (kind) {
    case "HABIT":
      return "/habit-tracker/daily";
    case "CHALLENGE":
      return `/habit-tracker/habits/others/${encodeURIComponent(targetKey)}`;
    case "TODO":
      return "/habit-tracker/todos";
    case "NAMAZ":
      return "/habit-tracker/habits?category=Namaz";
    case "RAMADAN":
      return "/habit-tracker/habits?category=Ramadan";
    case "BOOK":
      return "/habit-tracker/habits?category=Book";
    case "SKILL":
      return "/habit-tracker/habits?category=Course";
  }
}

// A link from the server is only followed within the app: "/habit-tracker",
// never "//elsewhere" or "https://...".
export function appPath(url: unknown): string | null {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\") ? url : null;
}

export interface ReminderListRow {
  id: string;
  kind: SavedReminderKind;
  kindLabel: string;
  name: string;
  summary: string;
  href: string;
}

const KIND_ORDER: SavedReminderKind[] = ["NAMAZ", "RAMADAN", "HABIT", "CHALLENGE", "BOOK", "SKILL"];
const KEY_ORDER: string[] = [...NAMAZ_KEYS, ...RAMADAN_KEYS];

// Settings › App's list: the reminders that are on, prayers in the day's
// order first, then habits, challenges, books and skills by name.
export function activeReminderRows(reminders: Reminder[], names: Record<string, string>, t: Translate, locale: FormatLocale = "en"): ReminderListRow[] {
  const keyOrder = (row: ReminderListRow, targetKey: string) => [KIND_ORDER.indexOf(row.kind), KEY_ORDER.indexOf(targetKey)] as const;
  return reminders
    .filter((reminder) => reminder.enabled && KIND_ORDER.includes(reminder.kind))
    .map((reminder) => {
      const row: ReminderListRow = {
        id: reminder.id,
        kind: reminder.kind,
        kindLabel: t(REMINDER_KIND_LABEL[reminder.kind]),
        name: reminderTargetName(reminder.kind, reminder.targetKey, names, t),
        summary: reminderSummary(reminder, t, locale),
        href: reminderHref(reminder.kind, reminder.targetKey),
      };
      return { row, order: keyOrder(row, reminder.targetKey) };
    })
    .sort((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1] || a.row.name.localeCompare(b.row.name))
    .map(({ row }) => row);
}
