import { describe, expect, it } from "vitest";
import type { HabitMonthTracker } from "./api";
import { challengeMark, challengeSummary, challengeWindow, dayDone } from "./challengeDisplay";
import { ashraSummary, parasOn, quranKhatam, ramadanCell, ramadanDays, ramadanStartIn, ramadanSummary, ramadanWindow, setupDefaultYear, setupYears, summaryNote, withParas } from "./ramadanDisplay";

const ramadan = (checks: [number, string][], overrides: Partial<HabitMonthTracker> = {}): HabitMonthTracker => ({
  id: "r",
  category: "Ramadan",
  month: 9,
  year: 2026,
  name: null,
  items: ["Roza", "Taraweeh"],
  totalDays: 30,
  elapsedDays: 0,
  todayDay: null,
  checks: checks.map(([day, item]) => ({ day, item, status: "ON_TIME" as const })),
  paras: [],
  createdAt: "2026-02-10T00:00:00.000Z",
  ...overrides,
});

describe("ramadan", () => {
  it("finds 1 Ramadan in a Gregorian year", () => {
    const start = ramadanStartIn(2026);
    expect(start).toMatch(/^2026-02-1\d$/);
    const days = ramadanDays(ramadan([]));
    expect(days[0].date).toBe(start);
    expect(days[20].ashra).toBe(3);
    expect(days[22].oddNight).toBe(true);
    expect(days[21].oddNight).toBe(false);
  });

  it("knows whether it is upcoming, going or completed", () => {
    const tracker = ramadan([]);
    const start = ramadanStartIn(2026) as string;
    expect(ramadanWindow(tracker, "2026-01-01").status).toBe("upcoming");
    expect(ramadanWindow(tracker, start)).toMatchObject({ status: "going", todayDay: 1, elapsedDays: 0 });
    expect(ramadanWindow(tracker, "2026-10-02")).toMatchObject({ status: "completed", todayDay: null, elapsedDays: 30, hijriYear: 1447 });
  });

  it("sums rows, ashras and odd nights", () => {
    const tracker = ramadan([[1, "Roza"], [1, "Taraweeh"], [2, "Roza"], [21, "Roza"], [21, "Taraweeh"]]);
    const done = ramadanWindow(tracker, "2026-10-02");
    expect(ramadanSummary(tracker, done)).toMatchObject({ done: 5, of: 60, pct: 8 });
    expect(ashraSummary(tracker, done)[0]).toMatchObject({ n: 1, done: 3, of: 20 });
    expect(ramadanCell(tracker, done, 2, "Taraweeh")).toBe("missed");
    const going = ramadanWindow(tracker, ramadanStartIn(2026) as string);
    expect(ramadanCell(tracker, going, 2, "Taraweeh")).toBe("locked");
    expect(ramadanCell(tracker, going, 1, "Roza")).toBe("done");
  });

  it("notes a row done every day, fasts to make up, and the last ten", () => {
    const lastTen = Array.from({ length: 10 }, (_, i) => [21 + i, "Tahajjud"] as [number, string]);
    const tracker = ramadan([...lastTen, [1, "Roza"]], { items: ["Roza", "Tahajjud", "Taraweeh"] });
    const over = ramadanWindow(tracker, "2026-10-02");
    const [roza, tahajjud, taraweeh] = ramadanSummary(tracker, over).items;
    expect(summaryNote(tracker, over, roza)).toEqual({ kind: "makeUp", fasts: 29 });
    expect(summaryNote(tracker, over, tahajjud)).toEqual({ kind: "lastTen", nights: true });
    expect(summaryNote(tracker, over, taraweeh)).toBeNull();
    const going = ramadanWindow(tracker, ramadanStartIn(2026) as string);
    expect(summaryNote(tracker, going, ramadanSummary(tracker, going).items[0])).toEqual({ kind: "everyDay" });
  });

  // From sehri until Roza is ticked, today is no fast owed yet.
  it("counts today only once its box is ticked while Ramadan is going", () => {
    const start = ramadanStartIn(2026) as string;
    const fifth = new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, Number(start.slice(8)) + 4)).toISOString().slice(0, 10);
    const fourFasts = ramadan([[1, "Roza"], [2, "Roza"], [3, "Roza"], [4, "Roza"]]);
    const day5 = ramadanWindow(fourFasts, fifth);
    expect(day5).toMatchObject({ status: "going", todayDay: 5, elapsedDays: 4 });
    const [roza] = ramadanSummary(fourFasts, day5).items;
    expect(roza).toMatchObject({ done: 4, of: 4, pct: 100 });
    expect(summaryNote(fourFasts, day5, roza)).toEqual({ kind: "everyDay" });
    const ticked = ramadan([[1, "Roza"], [2, "Roza"], [3, "Roza"], [4, "Roza"], [5, "Roza"]]);
    expect(ramadanSummary(ticked, day5).items[0]).toMatchObject({ done: 5, of: 5 });
    // A fast really missed on a past day still owes one.
    const missedThird = ramadan([[1, "Roza"], [2, "Roza"], [4, "Roza"]]);
    expect(summaryNote(missedThird, day5, ramadanSummary(missedThird, day5).items[0])).toEqual({ kind: "makeUp", fasts: 1 });
    expect(ashraSummary(fourFasts, day5)[0]).toMatchObject({ done: 4, of: 8 });
  });

  it("counts the paras towards a khatam, and the day it was finished", () => {
    const tracker = ramadan([], { paras: [{ day: 20, paras: 2 }, { day: 1, paras: 25 }, { day: 27, paras: 3 }, { day: 28, paras: 1 }] });
    expect(quranKhatam(tracker)).toEqual({ read: 31, finishedOn: 27 });
    expect(quranKhatam(ramadan([], { paras: [{ day: 3, paras: 4 }] }))).toEqual({ read: 4, finishedOn: null });
    expect(parasOn(tracker, 20)).toBe(2);
    expect(parasOn(tracker, 21)).toBe(0);
  });

  it("ticks the Quran row when paras are logged, and keeps it when they are cleared", () => {
    const tracker = ramadan([], { items: ["Roza", "quran"] });
    const logged = withParas(tracker, 4, 2);
    expect(logged.paras).toEqual([{ day: 4, paras: 2 }]);
    expect(logged.checks).toEqual([{ day: 4, item: "quran", status: "ON_TIME" }]);
    expect(withParas(logged, 4, 3).checks).toHaveLength(1);
    const cleared = withParas(logged, 4, 0);
    expect(cleared.paras).toEqual([]);
    expect(cleared.checks).toHaveLength(1);
    expect(withParas(ramadan([]), 4, 2).checks).toEqual([]);
  });

  it("offers the years with no sheet: around the next Ramadan, or any other nearby one once it has its sheet", () => {
    const sheets = [{ year: 2026 }, { year: 2027 }];
    expect(setupYears(sheets, 2027)).toEqual([2025, 2028, 2029, 2030]);
    // Another Ramadan: earlier ones and the ones after the next.
    expect(setupYears(sheets, 2027, "another")).toEqual([2021, 2022, 2023, 2024, 2025, 2028, 2029, 2030]);
    // Every one of them taken: nothing left to add.
    expect(setupYears([...sheets, ...[2021, 2022, 2023, 2024, 2025, 2028, 2029, 2030].map((year) => ({ year }))], 2027, "another")).toEqual([]);
  });

  it("opens the dialog on the nearest free year: forward for the next one, back first for another", () => {
    expect(setupDefaultYear([2025, 2028, 2029, 2030], 2027)).toBe(2028);
    expect(setupDefaultYear([2021, 2025], 2027)).toBe(2025);
    expect(setupDefaultYear([2021, 2025, 2028], 2027, "another")).toBe(2025);
    // Every earlier one taken: the first after the next.
    expect(setupDefaultYear([2028, 2030], 2027, "another")).toBe(2028);
    expect(setupDefaultYear([], 2027, "another")).toBe(2027);
  });
});

describe("challenge", () => {
  const challenge = (checks: [number, string][]): HabitMonthTracker => ({ ...ramadan(checks), category: "Others", month: null, year: null, name: "No Sugar", items: ["No sweets", "No soft drinks"], createdAt: "2026-09-21T04:00:00.000Z" });

  it("counts the day from when it was created", () => {
    const w = challengeWindow(challenge([]), "2026-10-02");
    expect(w).toEqual({ start: "2026-09-21", end: "2026-10-20", today: 12, status: "going", daysLeft: 18 });
    expect(challengeWindow(challenge([]), "2026-10-25").status).toBe("finished");
  });

  it("marks days and keeps a streak", () => {
    const all = Array.from({ length: 11 }, (_, i) => i + 1).flatMap((d) => [[d, "No sweets"], [d, "No soft drinks"]] as [number, string][]);
    const tracker = challenge(all.filter(([d]) => d !== 3));
    const w = challengeWindow(tracker, "2026-10-02");
    expect(dayDone(tracker, 1)).toBe(true);
    expect(challengeMark(tracker, w, 3)).toBe("missed");
    expect(challengeMark(tracker, w, 12)).toBe("today");
    expect(challengeMark(tracker, w, 13)).toBe("later");
    expect(challengeSummary(tracker, w)).toEqual({ done: 10, come: 12, missed: 1, pct: 33, streak: 8 });
  });
});
