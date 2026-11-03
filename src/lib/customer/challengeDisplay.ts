import type { HabitMonthTracker } from "./api";
import { dayOf, shiftDay } from "./habitDisplay";

// The maths behind a challenge (the "Others" category): a named sheet of
// N days that counts from its start date (today or tomorrow, as it was
// started; an older one from the UTC date it was created), on the platform
// calendar. It can be ended early, which stops it at that day.

export const CHALLENGE_PRESETS = [
  { days: 21, title: "A first try", sub: "Short enough to finish. Like waking up at 5 am." },
  { days: 30, title: "One month", sub: "A full month of something, like no sugar." },
  { days: 40, title: "The classic", sub: "Like a walk after Fajr every day." },
  { days: 66, title: "Make it stick", sub: "About how long a new habit takes to feel automatic." },
];

// "upcoming": started for tomorrow. "finished": past its last day, or
// ended early.
export type ChallengeStatus = "upcoming" | "going" | "finished";

export interface ChallengeWindow {
  // "YYYY-MM-DD" of day 1 and of the last day.
  start: string;
  end: string;
  // Today's day number: 0 before day 1, past the end once it is over.
  today: number;
  status: ChallengeStatus;
  daysLeft: number;
  // Ended early, and the last day it ran to (its last day, or the day it
  // was ended on).
  ended: boolean;
  lastDay: number;
}

export function challengeWindow(tracker: HabitMonthTracker, today: string): ChallengeWindow {
  const start = tracker.startsOn ?? tracker.createdAt.slice(0, 10);
  const end = shiftDay(start, tracker.totalDays - 1);
  const todayN = Math.round((dayOf(today).getTime() - dayOf(start).getTime()) / 86400000) + 1;
  const ended = tracker.endedOnDay != null;
  const lastDay = tracker.endedOnDay ?? tracker.totalDays;
  const status: ChallengeStatus = todayN < 1 ? "upcoming" : ended || todayN > tracker.totalDays ? "finished" : "going";
  return {
    start,
    end,
    today: status === "upcoming" ? 0 : Math.min(todayN, tracker.totalDays + 1),
    status,
    daysLeft: status === "upcoming" ? tracker.totalDays : status === "going" ? tracker.totalDays - todayN : 0,
    ended,
    lastDay,
  };
}

// The hidden item a challenge with no daily items of its own is ticked
// through: the day itself. The server only ticks an item the sheet has, so
// it is added to the sheet before its first tick (habitsActions).
export const DAY_ITEM = "done";

// What is ticked each day: the challenge's items, or the day itself.
export const dailyItems = (tracker: Pick<HabitMonthTracker, "items">): string[] => (tracker.items.length > 0 ? tracker.items : [DAY_ITEM]);

// Whether the day itself is what gets ticked (no items, or only the hidden one).
export const ticksTheDay = (tracker: Pick<HabitMonthTracker, "items">): boolean => tracker.items.every((item) => item === DAY_ITEM);

// A day is done when every item of the challenge is ticked; a challenge
// with no items ticks the day itself (one hidden item).
export function dayDone(tracker: HabitMonthTracker, day: number): boolean {
  return dailyItems(tracker).every((item) => tracker.checks.some((c) => c.day === day && c.item === item));
}

// The days so far (up to and including `upTo`) that are done: the ones a
// new item is ticked on too, so adding it never turns a done day missed.
export function doneDays(tracker: HabitMonthTracker, upTo: number): number[] {
  return Array.from({ length: Math.min(upTo, tracker.totalDays) }, (_, i) => i + 1).filter((day) => dayDone(tracker, day));
}

// The most done days a new item can be ticked on when it is added. Each
// tick is a request of its own, and the server takes 100 a minute from one
// address, page loads included; past this a new row would be refused
// halfway. Until the server can tick an item on many days at once, a
// challenge with more done days takes no new row.
export const MAX_BACKFILL_DAYS = 60;

// Past this many days a strip of one segment a day gets too thin to read,
// so the card draws one bar of done, missed and still to come instead.
export const MAX_STRIP_DAYS = 60;

export function stripTotals(tracker: HabitMonthTracker, window: ChallengeWindow): { done: number; missed: number; toCome: number } {
  let done = 0;
  let missed = 0;
  for (let day = 1; day <= tracker.totalDays; day++) {
    const mark = challengeMark(tracker, window, day);
    if (mark === "done") done++;
    else if (mark === "missed") missed++;
  }
  return { done, missed, toCome: tracker.totalDays - done - missed };
}

// "notReached": after the day a challenge was ended early.
export type ChallengeMark = "done" | "missed" | "today" | "later" | "notReached";

export function challengeMark(tracker: HabitMonthTracker, window: ChallengeWindow, day: number): ChallengeMark {
  if (dayDone(tracker, day)) return "done";
  if (window.ended && day > window.lastDay) return "notReached";
  if (window.status === "finished") return "missed";
  if (day === window.today && window.status === "going") return "today";
  if (day < window.today) return "missed";
  return "later";
}

export interface ChallengeSummary {
  done: number;
  // Days that have come, today included (up to the day it ended).
  come: number;
  missed: number;
  // Done days out of all of its days.
  pct: number;
  // Done days in a row ending today or yesterday (or its last day).
  streak: number;
  // The longest run of done days.
  best: number;
}

export function challengeSummary(tracker: HabitMonthTracker, window: ChallengeWindow): ChallengeSummary {
  const come = window.status === "upcoming" ? 0 : window.status === "finished" ? window.lastDay : Math.min(window.today, tracker.totalDays);
  let done = 0;
  let best = 0;
  let run = 0;
  for (let d = 1; d <= come; d++) {
    if (dayDone(tracker, d)) {
      done++;
      run++;
      best = Math.max(best, run);
    } else if (!(window.status === "going" && d === come)) run = 0;
  }
  let streak = 0;
  let cursor = window.status === "going" && !dayDone(tracker, come) ? come - 1 : come;
  while (cursor >= 1 && dayDone(tracker, cursor)) {
    streak++;
    cursor--;
  }
  const missed = window.status === "going" ? come - 1 - (done - (dayDone(tracker, come) ? 1 : 0)) : come - done;
  return { done, come, missed: Math.max(0, missed), pct: tracker.totalDays > 0 ? Math.round((done / tracker.totalDays) * 100) : 0, streak, best };
}

// A finished challenge counts as completed when it ran to its last day
// with at least this share of its days done.
export const COMPLETED_PCT = 80;

export type ChallengeOutcome = "going" | "completed" | "notCompleted";

// Going (or about to start), completed, or not completed (ended early, or
// under COMPLETED_PCT).
export function challengeOutcome(tracker: HabitMonthTracker, window: ChallengeWindow): ChallengeOutcome {
  if (window.status !== "finished") return "going";
  if (window.ended) return "notCompleted";
  return challengeSummary(tracker, window).pct >= COMPLETED_PCT ? "completed" : "notCompleted";
}

// The share of the days that have come that were done.
export function successRate(summary: ChallengeSummary): number {
  const counted = summary.done + summary.missed;
  return counted > 0 ? Math.round((summary.done / counted) * 100) : 0;
}

// The preset a length matches, if any.
export function presetFor(totalDays: number): (typeof CHALLENGE_PRESETS)[number] | null {
  return CHALLENGE_PRESETS.find((p) => p.days === totalDays) ?? null;
}

// How a challenge looks on its card (design-v4 ChallengesHome): an icon and
// a tint picked from its name, as a challenge has neither of its own. "No
// Sugar" gets the crossed-out circle in rose, "Wake up at 5 am" the alarm in
// amber, a reading one the book in orange; anything else the target in a
// tint that stays the same for the same name.
export type ChallengeIcon = "ban" | "alarm" | "book" | "phone" | "walk" | "water" | "prayer" | "target";
export type ChallengeTint = "rose" | "amber" | "orange" | "indigo" | "green" | "cyan" | "violet";

const LOOKS: { icon: ChallengeIcon; tint: ChallengeTint; words: RegExp }[] = [
  { icon: "phone", tint: "indigo", words: /social|phone|screen|facebook|instagram|tiktok|youtube|scroll|ফোন|ফেসবুক|স্ক্রিন|মোবাইল/i },
  { icon: "ban", tint: "rose", words: /\bno\b|sugar|sweet|soda|soft drink|smok|junk|quit|stop|চিনি|মিষ্টি|ধূমপান|ছাড়|বাদ/i },
  { icon: "alarm", tint: "amber", words: /wake|alarm|\bam\b|early|sleep|bed|ঘুম|ভোর|সকাল/i },
  { icon: "book", tint: "orange", words: /read|book|page|quran|qur'an|study|পড়|বই|কুরআন|পাতা/i },
  { icon: "walk", tint: "green", words: /walk|run|step|gym|exercise|workout|push|yoga|হাঁট|দৌড়|ব্যায়াম/i },
  { icon: "water", tint: "cyan", words: /water|drink|glass|পানি/i },
  { icon: "prayer", tint: "violet", words: /pray|fajr|salah|salat|namaz|tahajjud|dhikr|zikr|নামাজ|নামায|ফজর|তাহাজ্জুদ|জিকির/i },
];

const TINTS: ChallengeTint[] = ["violet", "cyan", "rose", "amber", "orange", "indigo", "green"];

export function challengeLook(name: string | null): { icon: ChallengeIcon; tint: ChallengeTint } {
  const text = (name ?? "").trim();
  const match = LOOKS.find((look) => look.words.test(text));
  if (match) return { icon: match.icon, tint: match.tint };
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return { icon: "target", tint: TINTS[hash % TINTS.length] };
}
