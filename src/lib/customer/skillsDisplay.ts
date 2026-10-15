// The sums behind Habits › Skills: units (lessons, or hours stored as
// minutes), the week of practice per skill, the streak and this year's
// goal. Pure, so the page and its tests agree.
import type { Skill, SkillStatus, SkillUnit, SkillWeekDay } from "./api";
import { shiftDay, WEEKDAY_LONG, weekdayOf } from "./habitDisplay";

// English, passed through t().
export const STATUS_LABEL: Record<SkillStatus, string> = { WANT_TO_LEARN: "Want to learn", LEARNING: "Learning", COMPLETED: "Completed" };

// The table's order: what is going on first, then the queue, then the done.
export const STATUS_ORDER: SkillStatus[] = ["LEARNING", "WANT_TO_LEARN", "COMPLETED"];

export const MAX_LESSONS = 2000;
export const MIN_MINUTES = 30;
export const MAX_MINUTES = 60_000;

export function progressPct(skill: Pick<Skill, "progress" | "target">): number {
  if (skill.target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((skill.progress / skill.target) * 100)));
}

// The optimistic twin of the server's progress rule (SkillsService.settle):
// all done -> COMPLETED, some -> LEARNING, none -> stays where it was (a
// completed skill dropped to 0 is LEARNING). The server's answer replaces
// this as soon as the request comes back.
export function applyProgress(skill: Skill, progress: number, year: number): Skill {
  const value = Math.min(Math.max(0, Math.round(progress)), skill.target);
  let status: SkillStatus = skill.status;
  if (value >= skill.target) status = "COMPLETED";
  else if (value > 0) status = "LEARNING";
  else if (skill.status === "COMPLETED") status = "LEARNING";
  return { ...skill, progress: value, status, completedYear: status === "COMPLETED" ? (skill.completedYear ?? year) : null };
}

// Hours are stored as minutes. 90 -> "1.5", 2400 -> "40", 45 -> "0.8".
export const hoursText = (minutes: number): string => String(Number((minutes / 60).toFixed(1)));

// What a learner types for hours ("1.5", "40", ".5") -> minutes; null if it
// isn't a plain positive number with up to two decimals.
export function parseHours(text: string): number | null {
  if (text === "" || text === "." || !/^\d*\.?\d{0,2}$/.test(text)) return null;
  return Math.round(Number(text) * 60);
}

// Hours as they are typed back into a field: 90 -> "1.5", 45 -> "0.75".
export const hoursInput = (minutes: number): string => String(Number((minutes / 60).toFixed(2)));

// The one quick-add button on a learning card, per unit. `amount` is in the
// skill's own unit; `label` is a dictionary key.
export const QUICK_ADD: Record<SkillUnit, { amount: number; label: string }> = {
  LESSONS: { amount: 1, label: "+1 lesson" },
  HOURS: { amount: 30, label: "+30 min" },
};

type T = (key: string) => string;

// "2 lessons", "1 lesson", "1.5 hours", "1 hour", "30 min".
export function amountText(unit: SkillUnit, amount: number, t: T): string {
  if (unit === "LESSONS") return `${amount} ${t(amount === 1 ? "lesson" : "lessons")}`;
  if (amount < 60) return `${amount} ${t("min")}`;
  const hours = hoursText(amount);
  return `${hours} ${t(hours === "1" ? "hour" : "hours")}`;
}

// What a week cell says: "2", "1.5h", "30m", or nothing for an empty day.
export function cellText(unit: SkillUnit, amount: number): string {
  if (amount <= 0) return "";
  if (unit === "LESSONS") return String(amount);
  return amount >= 60 ? `${hoursText(amount)}h` : `${amount}m`;
}

// "18 of 40 lessons", "12 of 30 hours".
export function progressText(skill: Pick<Skill, "unit" | "progress" | "target">, t: T): string {
  return skill.unit === "LESSONS" ? `${skill.progress} ${t("of")} ${skill.target} ${t("lessons")}` : `${hoursText(skill.progress)} ${t("of")} ${hoursText(skill.target)} ${t("hours")}`;
}

export const weekTotal = (week: SkillWeekDay[], skillId: string): number => week.reduce((sum, day) => sum + (day.bySkill[skillId] ?? 0), 0);

export interface Activity {
  date: string;
  amount: number;
}

// The latest day this week with something logged for the skill.
export function lastActivity(week: SkillWeekDay[], skillId: string): Activity | null {
  for (let i = week.length - 1; i >= 0; i--) {
    const amount = week[i].bySkill[skillId] ?? 0;
    if (amount > 0) return { date: week[i].date, amount };
  }
  return null;
}

// How a day relates to today, for "2 lessons today" and the like.
export function relativeDay(date: string, today: string): "today" | "yesterday" | "earlier" {
  if (date === today) return "today";
  if (date === shiftDay(today, -1)) return "yesterday";
  return "earlier";
}

// "2 lessons today", "1.5 hours yesterday", "30 min · Sunday"; null when
// nothing was logged this week.
export function practiceLine(skill: Pick<Skill, "id" | "unit">, week: SkillWeekDay[], today: string, t: T): string | null {
  const last = lastActivity(week, skill.id);
  if (!last) return null;
  const when = relativeDay(last.date, today);
  const day = when === "today" ? t("today") : when === "yesterday" ? t("yesterday") : `· ${t(WEEKDAY_LONG[weekdayOf(last.date)])}`;
  return `${amountText(skill.unit, last.amount, t)} ${day}`;
}

// The first day of the current streak, so the page can say "since Monday".
// The streak ends today when today has activity, otherwise yesterday.
export function streakStart(streak: number, week: SkillWeekDay[], today: string): string | null {
  if (streak <= 0) return null;
  const last = week[week.length - 1];
  const todayActive = last?.date === today && last.minutes + last.lessons > 0;
  return shiftDay(today, todayActive ? -(streak - 1) : -streak);
}

export interface WeekSums {
  lessons: number;
  minutes: number;
}

export const weekSums = (week: SkillWeekDay[]): WeekSums => week.reduce((sums, day) => ({ lessons: sums.lessons + day.lessons, minutes: sums.minutes + day.minutes }), { lessons: 0, minutes: 0 });

export const byStatus = (skills: Skill[], status: SkillStatus): Skill[] => skills.filter((skill) => skill.status === status);

export const completedIn = (skills: Skill[], year: number): Skill[] => skills.filter((skill) => skill.status === "COMPLETED" && skill.completedYear === year);

// "React", "React and Spoken English", "React, Python and 2 more".
export function namesLine(names: string[], and: string, more: string): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} ${and} ${names[1]}`;
  return `${names[0]}, ${names[1]} ${and} ${names.length - 2} ${more}`;
}
