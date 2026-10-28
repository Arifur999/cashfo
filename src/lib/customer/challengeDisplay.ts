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
