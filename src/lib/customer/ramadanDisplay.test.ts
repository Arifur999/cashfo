import { describe, expect, it } from "vitest";
import type { HabitMonthTracker } from "./api";
import { challengeMark, challengeSummary, challengeWindow, dayDone } from "./challengeDisplay";
import { ashraSummary, oddNights, ramadanCell, ramadanDays, ramadanStartIn, ramadanSummary, ramadanWindow } from "./ramadanDisplay";

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
  checks: checks.map(([day, item]) => ({ day, item })),
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
    expect(oddNights(tracker, done)[0]).toEqual({ day: 21, come: true, full: true });
    expect(ramadanCell(tracker, done, 2, "Taraweeh")).toBe("missed");
    const going = ramadanWindow(tracker, ramadanStartIn(2026) as string);
    expect(ramadanCell(tracker, going, 2, "Taraweeh")).toBe("locked");
    expect(ramadanCell(tracker, going, 1, "Roza")).toBe("done");
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
