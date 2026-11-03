import { describe, expect, it } from "vitest";
import type { HabitMonthTracker } from "./api";
import { challengeLook, challengeMark, challengeOutcome, challengeSummary, challengeWindow, dailyItems, DAY_ITEM, dayDone, doneDays, MAX_STRIP_DAYS, presetFor, stripTotals, successRate, ticksTheDay } from "./challengeDisplay";

const challenge = (items: string[], checks: [number, string][], totalDays = 30): HabitMonthTracker => ({
  id: "c",
  category: "Others",
  month: null,
  year: null,
  name: "No Sugar",
  items,
  totalDays,
  elapsedDays: 0,
  todayDay: null,
  checks: checks.map(([day, item]) => ({ day, item, status: "ON_TIME" as const })),
  paras: [],
  createdAt: "2026-09-21T04:00:00.000Z",
});

describe("start, end early and outcome", () => {
  const days = (from: number, to: number): [number, string][] => Array.from({ length: to - from + 1 }, (_, i) => [from + i, DAY_ITEM] as [number, string]);

  it("waits for a challenge started for tomorrow", () => {
    const tracker = { ...challenge([], []), startsOn: "2026-10-03" };
    const w = challengeWindow(tracker, "2026-10-02");
    expect(w).toMatchObject({ start: "2026-10-03", status: "upcoming", today: 0, daysLeft: 30 });
    expect(challengeMark(tracker, w, 1)).toBe("later");
    expect(challengeSummary(tracker, w)).toMatchObject({ done: 0, come: 0, missed: 0 });
    expect(challengeOutcome(tracker, w)).toBe("going");
    expect(challengeWindow(tracker, "2026-10-03")).toMatchObject({ status: "going", today: 1 });
  });

  it("stops a challenge ended early at that day", () => {
    const tracker = { ...challenge([], days(1, 6)), endedOnDay: 9 };
    const w = challengeWindow(tracker, "2026-10-02");
    expect(w).toMatchObject({ status: "finished", ended: true, lastDay: 9, daysLeft: 0 });
    expect(challengeMark(tracker, w, 6)).toBe("done");
    expect(challengeMark(tracker, w, 9)).toBe("missed");
    expect(challengeMark(tracker, w, 10)).toBe("notReached");
    expect(challengeSummary(tracker, w)).toMatchObject({ done: 6, come: 9, missed: 3, pct: 20 });
    expect(challengeOutcome(tracker, w)).toBe("notCompleted");
  });

  it("counts a finished one completed from 80% of its days", () => {
    const over = "2026-10-25";
    const enough = challenge([], days(1, 24));
    expect(challengeOutcome(enough, challengeWindow(enough, over))).toBe("completed");
    const short = challenge([], days(1, 23));
    expect(challengeOutcome(short, challengeWindow(short, over))).toBe("notCompleted");
  });

  it("keeps the best run and the success rate", () => {
    const tracker = challenge([], [...days(1, 3), ...days(5, 9)]);
    const summary = challengeSummary(tracker, challengeWindow(tracker, "2026-09-30"));
    expect(summary).toMatchObject({ done: 8, missed: 1, best: 5, streak: 5 });
    expect(successRate(summary)).toBe(89);
  });
});

describe("the day itself", () => {
  it("is ticked through a hidden item when the challenge has none", () => {
    expect(dailyItems(challenge([], []))).toEqual([DAY_ITEM]);
    expect(ticksTheDay(challenge([], []))).toBe(true);
    // Once saved on the sheet it is still the day itself.
    expect(ticksTheDay(challenge([DAY_ITEM], []))).toBe(true);
    expect(ticksTheDay(challenge(["No sweets"], []))).toBe(false);
    expect(dayDone(challenge([DAY_ITEM], [[1, DAY_ITEM]]), 1)).toBe(true);
  });
});

describe("doneDays", () => {
  // The days a new item gets ticked on, so adding it turns none of them missed.
  it("lists the days done so far", () => {
    const tracker = challenge(["No sweets", "No soft drinks"], [
      [1, "No sweets"],
      [1, "No soft drinks"],
      [2, "No sweets"],
      [3, "No sweets"],
      [3, "No soft drinks"],
    ]);
    expect(doneDays(tracker, 12)).toEqual([1, 3]);
    expect(doneDays(tracker, 2)).toEqual([1]);
  });
});

describe("stripTotals", () => {
  it("adds up done, missed and still to come", () => {
    const tracker = challenge([DAY_ITEM], [[1, DAY_ITEM], [2, DAY_ITEM], [4, DAY_ITEM]], 100);
    // 2 Oct is day 12 of 100.
    const window = challengeWindow(tracker, "2026-10-02");
    expect(stripTotals(tracker, window)).toEqual({ done: 3, missed: 8, toCome: 89 });
    expect(tracker.totalDays).toBeGreaterThan(MAX_STRIP_DAYS);
  });
});

describe("presetFor", () => {
  it("finds the ready-made length a challenge was started with", () => {
    expect(presetFor(40)?.title).toBe("The classic");
    expect(presetFor(10)).toBeNull();
  });
});

describe("challengeLook", () => {
  it("picks the board's icon and tint from the name", () => {
    expect(challengeLook("No Sugar")).toEqual({ icon: "ban", tint: "rose" });
    expect(challengeLook("Wake up at 5 am")).toEqual({ icon: "alarm", tint: "amber" });
    expect(challengeLook("Read 20 pages")).toEqual({ icon: "book", tint: "orange" });
    expect(challengeLook("No social media after Isha")).toEqual({ icon: "phone", tint: "indigo" });
    expect(challengeLook("সকালে হাঁটা").icon).toBe("alarm");
  });

  it("gives any other name the target, in the same tint every time", () => {
    const look = challengeLook("Learn a poem");
    expect(look.icon).toBe("target");
    expect(challengeLook("Learn a poem")).toEqual(look);
    expect(challengeLook(null).icon).toBe("target");
  });
});
