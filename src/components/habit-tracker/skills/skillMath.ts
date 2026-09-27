import type { Skill, SkillStatus, SkillUnit } from "@/lib/api";

export function progressPct(skill: Pick<Skill, "progress" | "target">): number {
  if (skill.target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((skill.progress / skill.target) * 100)));
}

// The optimistic twin of the server's progress rule (SkillsService.settle):
// all done -> COMPLETED, some -> LEARNING, none -> stays where it was (a
// completed skill dropped to 0 is LEARNING). The server's answer replaces this
// as soon as the request comes back.
export function applyProgress(skill: Skill, progress: number, year: number): Skill {
  const value = Math.min(Math.max(0, Math.round(progress)), skill.target);
  let status: SkillStatus = skill.status;
  if (value >= skill.target) status = "COMPLETED";
  else if (value > 0) status = "LEARNING";
  else if (skill.status === "COMPLETED") status = "LEARNING";
  return { ...skill, progress: value, status, completedYear: status === "COMPLETED" ? (skill.completedYear ?? year) : null };
}

// Hours are stored as minutes. 90 -> "1.5", 2400 -> "40", 45 -> "0.8".
export function hoursText(minutes: number): string {
  return String(Number((minutes / 60).toFixed(1)));
}

// What a learner types for hours ("1.5", "40", "2.", ".5") -> minutes; null if
// it isn't a plain positive number with up to two decimals ("" and "." alone
// don't count either).
export function parseHours(text: string): number | null {
  if (text === "" || text === "." || !/^\d*\.?\d{0,2}$/.test(text)) return null;
  return Math.round(Number(text) * 60);
}

// Hours as they are typed back into a field: 90 -> "1.5", 45 -> "0.75".
export function hoursInput(minutes: number): string {
  return String(Number((minutes / 60).toFixed(2)));
}

// Quick-add buttons on a card, per unit. `amount` is in the skill's own unit
// (lessons, or minutes); `value` + `suffix` (a dictionary key) is what the
// button says: "+1", "+30 min", "+1 h".
export const QUICK_ADD: Record<SkillUnit, { amount: number; value: string; suffix?: string }[]> = {
  LESSONS: [
    { amount: 1, value: "+1" },
    { amount: 2, value: "+2" },
  ],
  HOURS: [
    { amount: 30, value: "+30", suffix: "min" },
    { amount: 60, value: "+1", suffix: "h" },
  ],
};

// "12 / 24 lessons" or "8.5 / 40 h".
export function progressLine(skill: Skill, t: (s: string) => string): string {
  return skill.unit === "HOURS" ? `${hoursText(skill.progress)} / ${hoursText(skill.target)} ${t("h")}` : `${skill.progress} / ${skill.target} ${t("lessons")}`;
}

// "24 lessons" or "40 h" -- just the target, for a skill not started yet.
export function targetLine(skill: Skill, t: (s: string) => string): string {
  return skill.unit === "HOURS" ? `${hoursText(skill.target)} ${t("h")}` : `${skill.target} ${t("lessons")}`;
}

// "12 lessons left" or "31.5 h left".
export function leftLine(skill: Skill, t: (s: string) => string): string {
  const left = Math.max(0, skill.target - skill.progress);
  return skill.unit === "HOURS" ? `${hoursText(left)} ${t("h left")}` : `${left} ${t("lessons left")}`;
}

export interface SkillStats {
  learning: number;
  wantToLearn: number;
  completedThisYear: number;
  lessonsDone: number; // current progress summed across every LESSONS skill
  minutesLogged: number; // current progress summed across every HOURS skill
}

// A snapshot of where every skill stands right now -- not a lifetime total, so
// "Learn again" restarting a completed skill at 0 does lower these tiles (the
// skill's own progress really did drop back to 0).
export function skillStats(skills: Skill[], year: number): SkillStats {
  return {
    learning: skills.filter((s) => s.status === "LEARNING").length,
    wantToLearn: skills.filter((s) => s.status === "WANT_TO_LEARN").length,
    completedThisYear: skills.filter((s) => s.status === "COMPLETED" && s.completedYear === year).length,
    lessonsDone: skills.filter((s) => s.unit === "LESSONS").reduce((sum, s) => sum + s.progress, 0),
    minutesLogged: skills.filter((s) => s.unit === "HOURS").reduce((sum, s) => sum + s.progress, 0),
  };
}
