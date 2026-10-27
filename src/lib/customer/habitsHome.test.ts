import { describe, expect, it } from "vitest";
import type { Habit, HabitMonthLog, HabitMonthTracker, HabitToday } from "./api";
import { doneThisWeek, doneToday, fullDays, last7, prayedOn, prayerMarks, prayerStreak, restingToday, streakRows } from "./habitsHome";

const TODAY = "2026-10-15";

// October's sheet: every prayer ticked on the 11th to the 14th, Fajr only on
// the 15th so far; the 10th is missing Isha.
function sheet(): HabitMonthTracker {
  const checks: HabitMonthTracker["checks"] = [];
  for (const day of [11, 12, 13, 14]) for (const item of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]) checks.push({ day, item, status: "ON_TIME" });
  for (const item of ["Fajr", "Dhuhr", "Asr", "Maghrib"]) checks.push({ day: 10, item, status: "ON_TIME" });
  checks.push({ day: 15, item: "Fajr", status: "ON_TIME" });
  return { id: "oct", category: "Namaz", month: 10, year: 2026, name: null, items: ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"], totalDays: 31, elapsedDays: 14, todayDay: 15, checks, paras: [], createdAt: "2026-10-01T00:00:00.000Z" };
}

function habit(over: Partial<Habit> & { id: string }): Habit {
  return { userId: "u", name: over.id, category: "Daily", icon: "droplet", color: "blue", frequencyType: "DAILY", weeklyDays: [], weeklyCount: null, targetValue: null, unit: null, isArchived: false, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", ...over };
}

const row = (h: Habit, streak: number, completed: boolean | null): HabitToday => ({ ...h, streak, todayLog: completed === null ? null : { id: `${h.id}-log`, habitId: h.id, date: TODAY, completed, value: null, note: null, createdAt: TODAY } });

describe("prayers", () => {
  it("marks a day's prayers from its sheet", () => {
    expect(prayerMarks([sheet()], "2026-10-14", TODAY)).toEqual(["onTime", "onTime", "onTime", "onTime", "onTime"]);
    expect(prayerMarks([sheet()], "2026-10-10", TODAY)).toEqual(["onTime", "onTime", "onTime", "onTime", "missed"]);
    expect(prayerMarks([sheet()], TODAY, TODAY)).toEqual(["onTime", "open", "open", "open", "open"]);
    // How a prayer was prayed carries through to the grid, and a qaza counts as prayed.
    const marked = sheet();
    marked.checks = marked.checks.map((c) => (c.day === 13 && c.item === "Dhuhr" ? { ...c, status: "JAMAAT" as const } : c.day === 13 && c.item === "Fajr" ? { ...c, status: "QAZA" as const } : c));
    expect(prayerMarks([marked], "2026-10-13", TODAY).slice(0, 2)).toEqual(["qaza", "jamaat"]);
    expect(prayedOn([marked], "2026-10-13", TODAY)).toBe(5);
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
    expect(streakRows(rows, { skills: 5, reading: 6, prayers: 4 }).map((s) => `${s.kind}:${s.days}`)).toEqual(["habit:9", "reading:6", "skills:5", "prayers:4"]);
    expect(streakRows(rows, { skills: 0, reading: 0, prayers: 0 })).toHaveLength(1);
    expect(doneToday(rows)).toBe(1);
  });

  it("knows which habits rest today", () => {
    // 15 Oct 2026 is a Thursday: the walk is planned.
    expect(restingToday([water, walk], TODAY)).toEqual([]);
    const friday = habit({ id: "friday", frequencyType: "WEEKLY_DAYS", weeklyDays: [5] });
    expect(restingToday([water, friday], TODAY).map((h) => h.id)).toEqual(["friday"]);
  });
});

describe("a few times a week", () => {
  it("counts the days done in the week, Saturday to Friday", () => {
    const logs: HabitMonthLog[] = [
      { habitId: "gym", date: "2026-10-09", completed: true, value: null }, // Friday: the week before
      { habitId: "gym", date: "2026-10-10", completed: true, value: null }, // Saturday
      { habitId: "gym", date: "2026-10-12", completed: false, value: 10 },
      { habitId: "gym", date: "2026-10-14", completed: true, value: null },
      { habitId: "walk", date: "2026-10-14", completed: true, value: null },
    ];
    expect(doneThisWeek("gym", logs, TODAY)).toBe(2);
    expect(doneThisWeek("gym", logs, "2026-10-09")).toBe(1);
  });
});
