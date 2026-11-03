import { describe, expect, it } from "vitest";
import type { Habit, HabitMonthLog } from "./api";
import { habitMonthReport, habitsInMonth, habitTags, monthSummary } from "./habitReport";

const habit = (id: string, extra: Partial<Habit> = {}): Habit =>
  ({
    id,
    name: `Habit ${id}`,
    category: "Others",
    icon: "target",
    color: "blue",
    frequencyType: "DAILY",
    weeklyDays: [],
    weeklyCount: null,
    targetValue: null,
    unit: null,
    isArchived: false,
    createdAt: "2026-09-20T08:00:00.000Z",
    ...extra,
  }) as Habit;

const done = (habitId: string, ...days: string[]): HabitMonthLog[] => days.map((day) => ({ habitId, date: `${day}T00:00:00.000Z`, completed: true, value: null }));

// Friday 9 October 2026; the reader's weeks run Saturday to Friday.
const TODAY = "2026-10-09";

describe("habitMonthReport", () => {
  it("reads each day as done, missed, resting, open or later", () => {
    const walk = habit("walk");
    const logs = done("walk", "2026-10-01", "2026-10-02", "2026-10-04");
    const report = habitMonthReport([walk], logs, "2026-10", "2026-10-05");
    expect(report.rows[0].cells.slice(0, 6)).toEqual(["done", "done", "missed", "done", "open", "later"]);
    expect(report).toMatchObject({ done: 3, due: 4, missed: 1, pct: 75 });
    expect(report.rows[0].bestRun).toBe(2);
  });

  it("rests a certain-days habit on its other days and before it started", () => {
    // Sunday to Thursday; started on 6 October.
    const sleep = habit("sleep", { frequencyType: "WEEKLY_DAYS", weeklyDays: [0, 1, 2, 3, 4], createdAt: "2026-10-06T08:00:00.000Z" });
    const report = habitMonthReport([sleep], done("sleep", "2026-10-06"), "2026-10", TODAY);
    // 1 Thu … 5 Mon before it started; 6 Tue done, 7 Wed and 8 Thu missed, 9 Fri rests.
    expect(report.rows[0].cells.slice(0, 9)).toEqual(["rest", "rest", "rest", "rest", "rest", "done", "missed", "missed", "rest"]);
    expect(report.missesByWeekday[3] + report.missesByWeekday[4]).toBe(2);
  });

  it("counts an N-times-a-week habit by the week, missing the shortfall once the week is over", () => {
    const gym = habit("gym", { frequencyType: "WEEKLY_COUNT", weeklyCount: 3 });
    // Monday 12 October: the weeks to Friday 2nd and Friday 9th are over.
    const logs = done("gym", "2026-10-01", "2026-10-04");
    const report = habitMonthReport([gym], logs, "2026-10", "2026-10-12");
    const row = report.rows[0];
    // 1–2 Oct (Thu, Fri) end the week that started 26 Sep: 2 days in the month, 1 done, 1 missed.
    // 3–9 Oct: 1 done of 3, 2 missed on Friday 9th. 10–12 Oct: still going.
    expect(row.cells[0]).toBe("done");
    expect(row.cells[1]).toBe("rest");
    expect(row.missedAt[1]).toBe(1);
    expect(row.missedAt[8]).toBe(2);
    expect(row).toMatchObject({ done: 2, missed: 3, due: 5 });
  });

  it("adds up each day, the perfect ones and the weeks", () => {
    const a = habit("a");
    const b = habit("b");
    const logs = [...done("a", "2026-10-01", "2026-10-02"), ...done("b", "2026-10-01")];
    const report = habitMonthReport([a, b], logs, "2026-10", "2026-10-03");
    expect(report.totals.slice(0, 4)).toEqual([{ done: 2, due: 2 }, { done: 1, due: 2 }, { done: 0, due: 2 }, null]);
    expect(report.perfect).toBe(1);
    expect(report.weeks[0]).toEqual({ from: 1, to: 7, pct: 75 });
    expect(report.weeks.at(-1)).toEqual({ from: 29, to: 31, pct: null });
    expect(report.longest?.run).toBe(2);
  });

  it("shows archived habits only in months they were logged in", () => {
    const old = habit("old", { isArchived: true });
    expect(habitsInMonth([old], done("old", "2026-09-25"), "2026-10", TODAY)).toEqual([]);
    expect(habitsInMonth([old], done("old", "2026-10-02"), "2026-10", TODAY)).toHaveLength(1);
    // Not started yet that month.
    expect(habitsInMonth([habit("new", { createdAt: "2026-11-02T00:00:00.000Z" })], [], "2026-10", "2026-11-05")).toEqual([]);
  });

  it("sums a past month whole", () => {
    expect(monthSummary([habit("a")], done("a", "2026-09-20", "2026-09-21"), "2026-09", TODAY)).toEqual({ done: 2, due: 11, pct: 18 });
  });
});

describe("habitTags", () => {
  it("marks the best and the one that needs work", () => {
    const a = habit("a");
    const b = habit("b");
    const report = habitMonthReport([a, b], [...done("a", "2026-10-01", "2026-10-02"), ...done("b", "2026-10-01")], "2026-10", "2026-10-03");
    const tags = habitTags(report.rows);
    expect(tags.get("a")).toBe("best");
    expect(tags.get("b")).toBe("needs-work");
    expect(habitTags(report.rows.slice(0, 1)).size).toBe(0);
  });
});
