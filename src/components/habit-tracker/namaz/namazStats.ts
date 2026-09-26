import type { HabitMonthTracker } from "@/lib/api";

// 0 = Sunday ... 6 = Saturday, for a calendar day. Built from the tracker's
// own month/year (never "now"), so it renders the same on server and client.
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

// Tick = every ticked cell. Cross = unticked cells on days that have already
// passed (server's elapsedDays) -- an unticked cell today or later isn't a
// miss yet.
export function countTickCross(tracker: HabitMonthTracker): { tick: number; cross: number } {
  const tick = tracker.checks.length;
  const tickInElapsed = tracker.checks.filter((c) => c.day <= tracker.elapsedDays).length;
  const cross = Math.max(0, tracker.elapsedDays * tracker.items.length - tickInElapsed);
  return { tick, cross };
}

// The short follow-up message under each prayer, by how much of the elapsed
// days it was ticked: 100% (nothing missed) / 75-99 / 50-74 / 25-49 / below 25
// (0% included -- "start with today" fits it too). Nothing to judge yet (no
// day has passed) means no message.
export function encouragementFor(complete: number, total: number): { text: string; emoji: string; tone: string } | null {
  if (total === 0) return null;
  if (complete === total) return { text: "MashaAllah! Keep it up", emoji: "🌟", tone: "text-emerald-700" };
  const pct = Math.round((complete / total) * 100);
  if (pct >= 75) return { text: "Almost there, don't miss one", emoji: "💪", tone: "text-emerald-600" };
  if (pct >= 50) return { text: "Good effort, aim for more", emoji: "🤲", tone: "text-amber-600" };
  if (pct >= 25) return { text: "Needs attention, try to pray on time", emoji: "⏰", tone: "text-orange-600" };
  return { text: "Don't give up, start with today", emoji: "🌱", tone: "text-red-500" };
}

export interface PrayerStat {
  item: string;
  total: number; // days that have fully passed so far
  complete: number; // of those, days this prayer was ticked
  missing: number;
  completePct: number;
  missingPct: number;
  todayDone: boolean; // today's tick shows as a marker; it joins the totals once the day is over
  note: ReturnType<typeof encouragementFor>;
}

// Per-prayer numbers over the days that have fully passed -- the same "past
// days only" rule as the list's Cross, so the Missing figures add up to it.
export function prayerStats(tracker: HabitMonthTracker, ticked: Set<string>): PrayerStat[] {
  const total = tracker.elapsedDays;
  return tracker.items.map((item) => {
    const complete = tracker.checks.filter((c) => c.item === item && c.day <= total).length;
    const missing = Math.max(0, total - complete);
    return {
      item,
      total,
      complete,
      missing,
      completePct: total > 0 ? (complete / total) * 100 : 0,
      missingPct: total > 0 ? (missing / total) * 100 : 0,
      todayDone: tracker.todayDay !== null && ticked.has(`${tracker.todayDay}:${item}`),
      note: encouragementFor(complete, total),
    };
  });
}
