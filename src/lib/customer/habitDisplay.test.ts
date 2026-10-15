import { describe, expect, it } from "vitest";
import type { Habit, HabitMonthLog } from "./api";
import { bestStreak, completionRate, countTone, dayMark, habitStart, hijriDate, hijriParts, isPlannedOn, lastDays, monthGrid, nextRamadan, perfectDays, plannedCount, ruleLabel, weekOf } from "./habitDisplay";

const habit = (overrides: Partial<Habit>): Habit => ({
  id: "h",
  userId: "u",
  name: "Habit",
  category: "Others",
  icon: "droplet",
  color: "blue",
  frequencyType: "DAILY",
  weeklyDays: [],
  weeklyCount: null,
  targetValue: null,
  unit: null,
  isArchived: false,
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
  ...overrides,
});
const log = (habitId: string, date: string, completed = true): HabitMonthLog => ({ habitId, date: `${date}T00:00:00.000Z`, completed, value: null });

describe("weeks and days", () => {
  it("runs the week Saturday to Friday", () => {
    expect(weekOf("2026-10-02")).toEqual(["2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
    expect(weekOf("2026-09-26")[0]).toBe("2026-09-26");
    expect(lastDays("2026-10-02", 3)).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
  });

  it("knows which days a habit is planned for", () => {
    const sunToThu = habit({ frequencyType: "WEEKLY_DAYS", weeklyDays: [0, 1, 2, 3, 4] });
    expect(isPlannedOn(sunToThu, "2026-10-02")).toBe(false); // Friday
    expect(isPlannedOn(sunToThu, "2026-10-04")).toBe(true); // Sunday
    expect(isPlannedOn(habit({ frequencyType: "WEEKLY_COUNT", weeklyCount: 3 }), "2026-10-02")).toBe(true);
  });

  it("lays a month out in whole Saturday-first weeks", () => {
    const grid = monthGrid(2026, 9);
    // September 2026 starts on a Tuesday: three blanks first.
    expect(grid.slice(0, 4)).toEqual([null, null, null, "2026-09-01"]);
    expect(grid.length % 7).toBe(0);
    expect(grid.filter(Boolean)).toHaveLength(30);
  });
});

describe("ruleLabel", () => {
  it("reads a range, a list, a count and an amount", () => {
    expect(ruleLabel(habit({ frequencyType: "WEEKLY_DAYS", weeklyDays: [0, 1, 2, 3, 4] }))).toEqual({ days: "Sunday to Thursday", amount: null });
    expect(ruleLabel(habit({ frequencyType: "WEEKLY_DAYS", weeklyDays: [6, 0, 1] })).days).toBe("Saturday to Monday");
    expect(ruleLabel(habit({ frequencyType: "WEEKLY_DAYS", weeklyDays: [1, 3] })).days).toBe("Mon, Wed");
    expect(ruleLabel(habit({ frequencyType: "WEEKLY_COUNT", weeklyCount: 3, targetValue: 30, unit: "minutes" }))).toEqual({ days: "3 times a week", amount: "30 minutes" });
    expect(ruleLabel(habit({ targetValue: 8, unit: "glasses" }))).toEqual({ days: "Every day", amount: "8 glasses" });
  });
});

describe("rates, marks and streaks", () => {
  const days = lastDays("2026-10-02", 7);
  const daily = habit({ id: "d" });
  const logs = [log("d", "2026-09-26"), log("d", "2026-09-29"), log("d", "2026-09-30"), log("d", "2026-10-01"), log("d", "2026-10-02")];

  it("rates against the planned days, not 30", () => {
    expect(plannedCount(daily, days)).toBe(7);
    expect(plannedCount(habit({ frequencyType: "WEEKLY_COUNT", weeklyCount: 3 }), days)).toBe(3);
    expect(completionRate(daily, logs, days)).toBe(71);
    expect(completionRate(habit({ id: "x", frequencyType: "WEEKLY_DAYS", weeklyDays: [] }), logs, days)).toBeNull();
  });

  it("marks each day", () => {
    expect(dayMark(daily, logs, "2026-09-26", "2026-10-02")).toBe("done");
    expect(dayMark(daily, logs, "2026-09-27", "2026-10-02")).toBe("missed");
    expect(dayMark(daily, [], "2026-10-02", "2026-10-02")).toBe("open");
    expect(dayMark(daily, [], "2026-10-03", "2026-10-02")).toBe("future");
    expect(dayMark(habit({ id: "d", frequencyType: "WEEKLY_DAYS", weeklyDays: [0, 1, 2, 3, 4] }), [], "2026-10-02", "2026-10-02")).toBe("rest");
    expect(dayMark(daily, [], "2026-08-01", "2026-10-02")).toBe("rest"); // before it existed
    expect(habitStart(daily, [log("d", "2026-07-20")])).toBe("2026-07-20");
    expect(dayMark(daily, [log("d", "2026-07-20")], "2026-07-21", "2026-10-02")).toBe("missed");
  });

  it("finds the best streak, skipping rest days", () => {
    expect(bestStreak(daily, logs, "2026-10-02", 10)).toBe(4);
    const weekdays = habit({ id: "w", frequencyType: "WEEKLY_DAYS", weeklyDays: [0, 1, 2, 3, 4] });
    const run = [log("w", "2026-09-30"), log("w", "2026-10-01"), log("w", "2026-10-04")]; // Fri 2, Sat 3 rest
    expect(bestStreak(weekdays, run, "2026-10-04", 10)).toBe(3);
  });

  it("counts perfect days", () => {
    const two = [daily, habit({ id: "e" })];
    const both = [...logs, log("e", "2026-10-01"), log("e", "2026-10-02")];
    expect(perfectDays(two, both, days)).toBe(2);
  });

  it("colours a counted day", () => {
    expect(countTone(4, 8)).toBe("low");
    expect(countTone(6, 8)).toBe("near");
    expect(countTone(8, 8)).toBe("full");
  });
});

describe("Hijri", () => {
  it("writes the date in both languages without the era word", () => {
    expect(hijriDate("2026-10-02", "en")).toMatch(/^\d+ .+ 1448 AH$/);
    expect(hijriDate("2026-10-02", "bn")).toMatch(/হিজরি$/);
    expect(hijriParts("2026-10-02")).toMatchObject({ year: 1448 });
  });

  it("counts the days to the next Ramadan", () => {
    const next = nextRamadan("2026-10-02");
    expect(next.year).toBe(1448);
    expect(next.daysToGo).toBeGreaterThan(100);
    expect(next.daysToGo).toBeLessThan(160);
    expect(hijriParts(next.startsOn)).toMatchObject({ month: 9, day: 1 });
    expect(nextRamadan(next.startsOn).daysToGo).toBe(0);
  });
});
