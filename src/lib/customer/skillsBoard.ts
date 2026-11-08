// The rules behind the v16 Skills pages (SkillsHome, SkillsList, SkillDetail,
// SkillsDashboard): categories, units, the four states a skill is shown in,
// amounts, progress and pace, a target date's hint, days of practice, and
// the period the dashboard shows. Pure, so the pages and tests agree.
import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { type FormatLocale, langOf } from "@/lib/i18n/formatPrefs";
import { inEnglish, type Translate } from "@/lib/i18n/message";
import type { Skill, SkillLogRow, SkillResourceKind, SkillUnit } from "./api";
import { latinDigits } from "./habitDisplay";

export const LEARNING_NOW_HREF = "/habit-tracker/habits?category=Course";
export const MY_SKILLS_HREF = "/habit-tracker/habits/skills";
export const SKILLS_DASHBOARD_HREF = "/habit-tracker/habits/skills/dashboard";
export const skillHref = (id: string, tab?: string) => `${MY_SKILLS_HREF}/${id}${tab ? `?tab=${tab}` : ""}`;

// --- Categories ---

export type SkillCategory = "tech" | "lang" | "design" | "biz" | "deen" | "life";
export interface CategoryInfo {
  id: SkillCategory;
  label: string; // English, through t()
  // The colour a new skill in it takes (a skillPalette key).
  color: string;
  // Tailwind classes: the tile and the ink.
  tile: string;
  ink: string;
  ring: string;
  dot: string;
}
export const SKILL_CATEGORIES: CategoryInfo[] = [
  { id: "tech", label: "Tech & coding", color: "violet", tile: "bg-tint-violet", ink: "text-tint-violet-ink", ring: "border-tint-violet-ink", dot: "bg-tint-violet-ink" },
  { id: "lang", label: "Languages", color: "sky", tile: "bg-sky-soft", ink: "text-sky", ring: "border-sky", dot: "bg-sky" },
  { id: "design", label: "Design & creative", color: "rose", tile: "bg-tint-pink", ink: "text-tint-pink-ink", ring: "border-tint-pink-ink", dot: "bg-tint-pink-ink" },
  { id: "biz", label: "Business & work", color: "lime", tile: "bg-tint-green", ink: "text-tint-green-ink", ring: "border-tint-green-ink", dot: "bg-tint-green-ink" },
  { id: "deen", label: "Deen & Quran", color: "teal", tile: "bg-tint-teal", ink: "text-tint-teal-ink", ring: "border-tint-teal-ink", dot: "bg-tint-teal-ink" },
  { id: "life", label: "Life skills", color: "amber", tile: "bg-warning-soft", ink: "text-warning", ring: "border-warning", dot: "bg-warning" },
];
export const categoryOf = (id: string | undefined): CategoryInfo => SKILL_CATEGORIES.find((c) => c.id === id) ?? SKILL_CATEGORIES[SKILL_CATEGORIES.length - 1];

// --- Units ---

export interface UnitInfo {
  label: string;
  one: string;
  many: string;
  // Quick adds in the stored unit (minutes for hours).
  quick: number[];
}
export const UNITS: Record<SkillUnit, UnitInfo> = {
  LESSONS: { label: "Lessons", one: "lesson", many: "lessons", quick: [1, 2, 3, 5] },
  HOURS: { label: "Hours", one: "hour", many: "hours", quick: [15, 30, 45, 60] },
  CHAPTERS: { label: "Chapters", one: "chapter", many: "chapters", quick: [1, 2, 3, 5] },
};
export const UNIT_ORDER: SkillUnit[] = ["LESSONS", "HOURS", "CHAPTERS"];

// "3 lessons", "1 chapter", "1h 30m", "45m", "2h".
export function amountOf(unit: SkillUnit, value: number, t: Translate = inEnglish, locale: FormatLocale = "en"): string {
  const n = (v: number) => formatCount(v, locale);
  if (unit === "HOURS") {
    const hours = Math.floor(value / 60);
    const minutes = Math.round(value % 60);
    if (hours && minutes) return t("{hours}h {minutes}m", { hours: n(hours), minutes: n(minutes) });
    if (hours) return t("{hours}h", { hours: n(hours) });
    return t("{minutes}m", { minutes: n(minutes) });
  }
  const one = unit === "CHAPTERS" ? "{count} chapter" : "{count} lesson";
  const many = unit === "CHAPTERS" ? "{count} chapters" : "{count} lessons";
  return t(value === 1 ? one : many, { count: n(value) });
}

// The number a skill is counted in as shown: lessons as they are, hours
// from minutes to one decimal.
export const shownCount = (unit: SkillUnit, raw: number): number => (unit === "HOURS" ? Math.round(raw / 6) / 10 : raw);
const shownText = (unit: SkillUnit, raw: number, locale: FormatLocale) => toLocaleDigits(String(shownCount(unit, raw)), locale);

// "40 lessons", "30 hours".
export const totalText = (skill: Pick<Skill, "unit" | "target">, t: Translate = inEnglish, locale: FormatLocale = "en"): string =>
  t(`{count} ${UNITS[skill.unit].many}`, { count: shownText(skill.unit, skill.target, locale) });

// --- The state a skill is shown in ---

export type SkillState = "learning" | "want" | "paused" | "done";
export const stateOf = (skill: Pick<Skill, "status" | "pausedAt">): SkillState =>
  skill.status === "COMPLETED" ? "done" : skill.status === "WANT_TO_LEARN" ? "want" : skill.pausedAt ? "paused" : "learning";
export const STATE_INFO: Record<SkillState, { label: string; chip: string; dot: string }> = {
  learning: { label: "Learning", chip: "bg-info-soft text-tint-blue-ink", dot: "bg-info" },
  want: { label: "Want to learn", chip: "bg-surface-sunken text-ink-soft", dot: "bg-ink-faint" },
  paused: { label: "Paused", chip: "bg-warning-soft text-warning", dot: "bg-warning-fill" },
  done: { label: "Completed", chip: "bg-success-soft text-tint-green-ink", dot: "bg-success" },
};
export const STATE_ORDER: Record<SkillState, number> = { learning: 0, paused: 1, want: 2, done: 3 };
// What the API is sent to put a skill in a state.
export const stateInput = (state: SkillState): { status: Skill["status"]; paused?: boolean } =>
  state === "done" ? { status: "COMPLETED" } : state === "want" ? { status: "WANT_TO_LEARN" } : { status: "LEARNING", paused: state === "paused" };

// --- Progress ---

export interface Progress {
  // In the stored unit (minutes for hours).
  done: number;
  total: number;
  left: number;
  pct: number;
}
export function progressOf(skill: Pick<Skill, "progress" | "target" | "status">): Progress {
  const done = skill.status === "COMPLETED" ? skill.target : skill.progress;
  const pct = skill.target > 0 ? Math.min(100, Math.round((done / skill.target) * 100)) : 0;
  return { done, total: skill.target, left: Math.max(0, skill.target - done), pct };
}

// "18 / 40 lessons" pieces: the number done and "40 lessons".
export const doneText = (skill: Pick<Skill, "unit" | "progress" | "target" | "status">, locale: FormatLocale = "en"): string => shownText(skill.unit, progressOf(skill).done, locale);

const shiftDay = (day: string, by: number): string => new Date(Date.parse(`${day}T00:00:00.000Z`) + by * 86_400_000).toISOString().slice(0, 10);
export const daysBetween = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000);

// The amount practised each day per skill, from the overview's rows.
export const logsOf = (logs: SkillLogRow[], skillId: string): SkillLogRow[] => logs.filter((row) => row.skillId === skillId);

// The pace: practice a day over the last 14 days (stored unit).
export function pace14(logs: SkillLogRow[], today: string): number {
  const from = shiftDay(today, -13);
  return logs.filter((row) => row.date >= from && row.date <= today).reduce((sum, row) => sum + row.amount, 0) / 14;
}

// Days left at a pace, at least one; 0 with no pace.
export const daysAt = (left: number, pace: number): number => (pace > 0 ? Math.max(1, Math.ceil(left / pace)) : 0);

// The last seven days of one skill, oldest first.
export function skillWeek(logs: SkillLogRow[], today: string): { date: string; amount: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftDay(today, i - 6);
    return { date, amount: logs.filter((row) => row.date === date).reduce((sum, row) => sum + row.amount, 0) };
  });
}

export type TargetTone = "good" | "late" | "behind" | "none";

// Where a skill stands against its target date: reached, on track at its
// pace, behind by some days, or past the day.
export function targetLine(targetDate: string | null | undefined, left: number, pace: number, today: string, t: Translate = inEnglish, locale: FormatLocale = "en"): { tone: TargetTone; hint: string } {
  if (!targetDate) return { tone: "none", hint: "" };
  if (left <= 0) return { tone: "good", hint: t("reached") };
  const until = daysBetween(today, targetDate);
  if (until < 0) return { tone: "late", hint: t("date passed") };
  const need = daysAt(left, pace);
  if (need && need <= until) return { tone: "good", hint: t("on track") };
  if (!need) return { tone: "behind", hint: t("behind, start practising") };
  const behind = need - until;
  return { tone: "behind", hint: t(behind === 1 ? "behind by about {count} day" : "behind by about {count} days", { count: formatCount(behind, locale) }) };
}

// What a day must hold to finish by the target: "about 2 lessons a day".
export function perDayToTarget(unit: SkillUnit, left: number, targetDate: string, today: string, t: Translate = inEnglish, locale: FormatLocale = "en"): string | null {
  const days = daysBetween(today, targetDate);
  if (left <= 0 || days <= 0) return null;
  const per = left / days;
  if (unit === "HOURS") return t("about {count} minutes a day", { count: formatCount(Math.ceil(per), locale) });
  return t(`about {count} ${UNITS[unit].many} a day`, { count: toLocaleDigits(String(Math.round(per * 10) / 10), locale) });
}

// --- Numbers typed into the forms ---

// A day's practice as typed: a whole number from 1.
export function parseWhole(raw: string): number | null {
  const text = latinDigits(raw).trim();
  return /^\d+$/.test(text) && Number(text) >= 1 ? Number(text) : null;
}

export type CountProblem = "empty" | "number" | "whole" | "big" | "overTotal";

// A total or "already done" as typed: hours may have one decimal place, the
// others are whole; stored as minutes for hours.
export function parseCount(raw: string, unit: SkillUnit, { allowZero = false } = {}): { value: number } | { problem: CountProblem } {
  const text = latinDigits(raw).trim();
  if (!text) return allowZero ? { value: 0 } : { problem: "empty" };
  if (!/^\d+(\.\d+)?$/.test(text)) return { problem: "number" };
  const number = Number(text);
  if (!allowZero && number <= 0) return { problem: "number" };
  if (unit !== "HOURS" && text.includes(".")) return { problem: "whole" };
  if (number > 5000) return { problem: "big" };
  return { value: unit === "HOURS" ? Math.round(number * 60) : number };
}

// The number a form shows for a stored amount.
export const countInput = (unit: SkillUnit, stored: number): string => String(shownCount(unit, stored));

// A web link as the backend takes it ("udemy.com" -> "https://udemy.com"),
// or null when it isn't one; '' stays ''.
export function normalizeLink(raw: string): string | null {
  const text = raw.trim();
  if (!text) return "";
  const link = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  return /^https?:\/\/[^\s/.]+(\.[^\s/.]+)*\.[a-z]{2,}(\/\S*)?$/i.test(link) && link.length <= 300 ? link : null;
}

// "udemy.com" for a link's row.
export function linkHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const RESOURCE_KINDS: { id: SkillResourceKind; label: string }[] = [
  { id: "COURSE", label: "Course" },
  { id: "VIDEO", label: "Video" },
  { id: "BOOK", label: "Book" },
  { id: "LINK", label: "Link" },
];

// --- Days of practice ---

// "Today", "Yesterday", "3 days ago", else the long date.
export function agoText(day: string | null, today: string, t: Translate = inEnglish, locale: FormatLocale = "en"): string {
  if (!day) return t("Not started");
  const n = daysBetween(day, today);
  if (n <= 0) return t("Today");
  if (n === 1) return t("Yesterday");
  if (n < 7) return t("{count} days ago", { count: formatCount(n, locale) });
  return formatDay(day, "d MMMM yyyy", locale);
}

// Days in a row with any practice up to today (or yesterday while today has none).
export function streakOf(days: Iterable<string>, today: string): number {
  const has = new Set(days);
  let streak = 0;
  for (let day = has.has(today) ? today : shiftDay(today, -1); has.has(day); day = shiftDay(day, -1)) streak++;
  return streak;
}

// The first day of the week `today` falls in, the week opening on `weekStart` (0 Sunday … 6 Saturday).
export function weekStartDay(today: string, weekStart: number): string {
  const weekday = new Date(`${today}T00:00:00.000Z`).getUTCDay();
  return shiftDay(today, -((weekday - weekStart + 7) % 7));
}

// The squares of a practice calendar: `weeks` columns ending in the week of
// today, each from the reader's first day; a day still to come is null.
export function calendarWeeks(today: string, weeks: number, weekStart: number): (string | null)[][] {
  const first = shiftDay(weekStartDay(today, weekStart), -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, c) => Array.from({ length: 7 }, (_, r) => {
    const day = shiftDay(first, c * 7 + r);
    return day > today ? null : day;
  }));
}

// The shade of a day: 0 none, then 1-4 by its share of the busiest day.
export const levelOf = (value: number, max: number): number => (value <= 0 || max <= 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((value / max) * 4))));

// A weekday's short name ("Mo", "সো") for a calendar's rows.
const EN_INITIALS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const BN_INITIALS = ["র", "সো", "ম", "বু", "বৃ", "শু", "শ"];
export const weekdayInitial = (day: string, locale: FormatLocale): string => (langOf(locale) === "bn" ? BN_INITIALS : EN_INITIALS)[new Date(`${day}T00:00:00.000Z`).getUTCDay()];

// --- The dashboard's period ---

export type SkillsPeriod = { kind: "month"; year: number; month: number } | { kind: "year"; year: number };
export type PeriodPreset = "tm" | "lm" | "ty" | "ly";

// ?period=tm|lm|ty|ly|YYYY|YYYY-MM, this month when missing or unreadable.
export function readSkillsPeriod(value: unknown, today: string): SkillsPeriod {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const text = typeof value === "string" ? value : "tm";
  if (text === "lm") return month === 1 ? { kind: "month", year: year - 1, month: 12 } : { kind: "month", year, month: month - 1 };
  if (text === "ty") return { kind: "year", year };
  if (text === "ly") return { kind: "year", year: year - 1 };
  const monthMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(text);
  if (monthMatch && Number(monthMatch[1]) >= 2000 && `${text}` <= today.slice(0, 7)) return { kind: "month", year: Number(monthMatch[1]), month: Number(monthMatch[2]) };
  if (/^\d{4}$/.test(text) && Number(text) >= 2000 && Number(text) <= year) return { kind: "year", year: Number(text) };
  return { kind: "month", year, month };
}

const pad = (n: number) => String(n).padStart(2, "0");

// The period's first and last day.
export function periodDays(period: SkillsPeriod): { from: string; to: string } {
  if (period.kind === "year") return { from: `${period.year}-01-01`, to: `${period.year}-12-31` };
  const last = new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();
  return { from: `${period.year}-${pad(period.month)}-01`, to: `${period.year}-${pad(period.month)}-${pad(last)}` };
}

// The address's word for a period (the presets for this and last month and year).
export function periodParam(period: SkillsPeriod, today: string): string {
  const now = readSkillsPeriod("tm", today);
  const last = readSkillsPeriod("lm", today);
  const year = Number(today.slice(0, 4));
  if (period.kind === "year") return period.year === year ? "ty" : period.year === year - 1 ? "ly" : String(period.year);
  if (period.kind === "month" && now.kind === "month" && period.year === now.year && period.month === now.month) return "tm";
  if (last.kind === "month" && period.year === last.year && period.month === last.month) return "lm";
  return `${period.year}-${pad(period.month)}`;
}
