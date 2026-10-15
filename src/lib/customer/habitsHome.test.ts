import { describe, expect, it } from "vitest";
import type { Habit, HabitMonthLog, HabitMonthTracker, HabitToday } from "./api";
import { doneToday, fullDays, last7, prayedOn, prayerMarks, prayerStreak, restingToday, streakRows } from "./habitsHome";

const TODAY = "2026-10-15";

// October's sheet: every prayer ticked on the 11th to the 14th, Fajr only on
// the 15th so far; the 10th is missing Isha.
function sheet(): HabitMonthTracker {
  const checks: { day: number; item: string }[] = [];
  for (const day of [11, 12, 13, 14]) for (const item of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]) checks.push({ day, item });
  for (const item of ["Fajr", "Dhuhr", "Asr", "Maghrib"]) checks.push({ day: 10, item });
  checks.push({ day: 15, item: "Fajr" });
  return { id: "oct", category: "Namaz", month: 10, year: 2026, name: null, items: ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"], totalDays: 31, elapsedDays: 14, todayDay: 15, checks, createdAt: "2026-10-01T00:00:00.000Z" };
}

function habit(over: Partial<Habit> & { id: string }): Habit {
  return { userId: "u", name: over.id, category: "Daily", icon: "droplet", color: "blue", frequencyType: "DAILY", weeklyDays: [], weeklyCount: null, targetValue: null, unit: null, isArchived: false, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", ...over };
}

const row = (h: Habit, streak: number, completed: boolean | null): HabitToday => ({ ...h, streak, todayLog: completed === null ? null : { id: `${h.id}-log`, habitId: h.id, date: TODAY, completed, value: null, note: null, createdAt: TODAY } });

describe("prayers", () => {
  it("marks a day's prayers from its sheet", () => {
    expect(prayerMarks([sheet()], "2026-10-14", TODAY)).toEqual(["prayed", "prayed", "prayed", "prayed", "prayed"]);
    expect(prayerMarks([sheet()], "2026-10-10", TODAY)).toEqual(["prayed", "prayed", "prayed", "prayed", "missed"]);
    expect(prayerMarks([sheet()], TODAY, TODAY)).toEqual(["prayed", "open", "open", "open", "open"]);
    expect(prayerMarks([sheet()], "2026-10-16", TODAY)).toEqual(["none", "none", "none", "none", "none"]);
    // No sheet for September: nothing to say.
    expect(prayerMarks([sheet()], "2026-09-30", TODAY)).toEqual(["none", "none", "none", "none", "none"]);
    expect(prayedOn([sheet()], "2026-10-10", TODAY)).toBe(4);
  });

  it("counts the days in a row with all five, through yesterday when today is open", () => {
    expect(prayerStreak([sheet()], TODAY)).toBe(4);
    expect(prayerStreak([], TODAY)).toBe(0);
  });
});

describe("the last seven days", () => {
  const water = habit({ id: "water" });
  const walk = habit({ id: "walk", frequencyType: "WEEKLY_DAYS", weeklyDays: [0, 1, 2, 3, 4] }); // Sunday to Thursday
  const logs: HabitMonthLog[] = [
    { habitId: "water", date: "2026-10-13", completed: true, value: null },
    { habitId: "water", date: "2026-10-14", completed: true, value: null },
    { habitId: "walk", date: "2026-10-14", completed: true, value: null },
    { habitId: "water", date: "2026-10-15", completed: true, value: null },
  ];

  it("lines prayers and habits up per day", () => {
    const bars = last7([sheet()], [water, walk], logs, TODAY);
    expect(bars).toHaveLength(7);
    expect(bars[0].day).toBe("2026-10-09");
    expect(bars[5]).toEqual({ day: "2026-10-14", prayed: 5, habitsDone: 2, habitsDue: 2 });
    // Friday the 9th: the walk rests, only water is due.
    expect(bars[0]).toMatchObject({ habitsDue: 1, habitsDone: 0 });
    expect(bars[6]).toMatchObject({ day: TODAY, prayed: 1, habitsDone: 1, habitsDue: 2 });
  });

  it("totals only the days that are over", () => {
    const sums = fullDays(last7([sheet()], [water, walk], logs, TODAY));
    expect(sums.days).toBe(6);
    expect(sums.prayersDue).toBe(30);
    expect(sums.prayed).toBe(4 + 5 * 4);
    expect(sums.habitsDone).toBe(3);
  });

  it("lists the streaks that are alive, longest first", () => {
    const rows = [row(water, 9, true), row(walk, 0, null)];
    expect(streakRows(rows, 5, 4).map((s) => `${s.kind}:${s.days}`)).toEqual(["habit:9", "skills:5", "prayers:4"]);
    expect(streakRows(rows, 0, 0)).toHaveLength(1);
    expect(doneToday(rows)).toBe(1);
  });

  it("knows which habits rest today", () => {
    // 15 Oct 2026 is a Thursday: the walk is planned.
    expect(restingToday([water, walk], TODAY)).toEqual([]);
    const friday = habit({ id: "friday", frequencyType: "WEEKLY_DAYS", weeklyDays: [5] });
    expect(restingToday([water, friday], TODAY).map((h) => h.id)).toEqual(["friday"]);
  });
});
