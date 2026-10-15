import type { HabitMonthTracker } from "./api";
import { dayOf, shiftDay } from "./habitDisplay";

// The maths behind a challenge (the "Others" category): a named sheet of
// N days that counts from the day it was created. Day N = days since
// createdAt, on the platform calendar.

export const CHALLENGE_PRESETS = [
  { days: 21, title: "A first try", sub: "Short enough to finish. Like waking up at 5 am." },
  { days: 30, title: "One month", sub: "A full month of something, like no sugar." },
  { days: 40, title: "The classic 40", sub: "Like a walk after Fajr every day." },
  { days: 66, title: "Make it stick", sub: "About how long a new habit takes to feel automatic." },
];

export type ChallengeStatus = "going" | "finished";

export interface ChallengeWindow {
  // "YYYY-MM-DD" of day 1 and of the last day.
  start: string;
  end: string;
  // Today's day number, past the end once it is over.
  today: number;
  status: ChallengeStatus;
  daysLeft: number;
}

export function challengeWindow(tracker: HabitMonthTracker, today: string): ChallengeWindow {
  const start = tracker.createdAt.slice(0, 10);
  const end = shiftDay(start, tracker.totalDays - 1);
  const todayN = Math.max(1, Math.round((dayOf(today).getTime() - dayOf(start).getTime()) / 86400000) + 1);
  const status: ChallengeStatus = todayN > tracker.totalDays ? "finished" : "going";
  return { start, end, today: Math.min(todayN, tracker.totalDays + 1), status, daysLeft: Math.max(0, tracker.totalDays - todayN) };
}

// A day is done when every item of the challenge is ticked; a challenge
// with no items ticks the day itself (one hidden item).
export function dayDone(tracker: HabitMonthTracker, day: number): boolean {
  const items = tracker.items.length > 0 ? tracker.items : ["done"];
  return items.every((item) => tracker.checks.some((c) => c.day === day && c.item === item));
}

export type ChallengeMark = "done" | "missed" | "today" | "later";

export function challengeMark(tracker: HabitMonthTracker, window: ChallengeWindow, day: number): ChallengeMark {
  if (dayDone(tracker, day)) return "done";
  if (day === window.today && window.status === "going") return "today";
  if (day < window.today) return "missed";
  return "later";
}

export interface ChallengeSummary {
  done: number;
  // Days that have come, today included.
  come: number;
  missed: number;
  pct: number;
  // Done days in a row ending today or yesterday.
  streak: number;
}

export function challengeSummary(tracker: HabitMonthTracker, window: ChallengeWindow): ChallengeSummary {
  const come = Math.min(window.today, tracker.totalDays);
  let done = 0;
  for (let d = 1; d <= come; d++) if (dayDone(tracker, d)) done++;
  let streak = 0;
  let cursor = window.status === "going" && !dayDone(tracker, come) ? come - 1 : come;
  while (cursor >= 1 && dayDone(tracker, cursor)) {
    streak++;
    cursor--;
  }
  const missed = window.status === "going" ? come - 1 - (done - (dayDone(tracker, come) ? 1 : 0)) : come - done;
  return { done, come, missed: Math.max(0, missed), pct: tracker.totalDays > 0 ? Math.round((done / tracker.totalDays) * 100) : 0, streak };
}

// The preset a length matches, if any.
export function presetFor(totalDays: number): (typeof CHALLENGE_PRESETS)[number] | null {
  return CHALLENGE_PRESETS.find((p) => p.days === totalDays) ?? null;
}
