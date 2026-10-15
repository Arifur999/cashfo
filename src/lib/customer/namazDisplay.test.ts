import { describe, expect, it } from "vitest";
import type { HabitMonthTracker } from "./api";
import { canMark, cellState, dayTotals, hijriRange, monthInsights, monthSummary, prayerSummaries, PRAYERS, yearSummary } from "./namazDisplay";

// September 2026, viewed on the 4th at some point during the day: three
// days fully past, today the 4th.
const sheet = (checks: [number, string][], overrides: Partial<HabitMonthTracker> = {}): HabitMonthTracker => ({
  id: "t",
  category: "Namaz",
  month: 9,
  year: 2026,
  name: null,
  items: [...PRAYERS],
  totalDays: 30,
  elapsedDays: 3,
  todayDay: 4,
  checks: checks.map(([day, item]) => ({ day, item })),
  ...overrides,
});

const fullDays = (days: number[]) => days.flatMap((day) => PRAYERS.map((p) => [day, p] as [number, string]));

describe("cells", () => {
  const tracker = sheet([...fullDays([1, 2]), [3, "Fajr"], [4, "Fajr"]]);
  it("reads prayed, missed, open and locked", () => {
    expect(cellState(tracker, 1, "Isha")).toBe("prayed");
    expect(cellState(tracker, 3, "Dhuhr")).toBe("missed");
    expect(cellState(tracker, 4, "Dhuhr")).toBe("open");
    expect(cellState(tracker, 5, "Fajr")).toBe("locked");
    expect(canMark(tracker, 4)).toBe(true);
    expect(canMark(tracker, 5)).toBe(false);
  });

  it("totals each day", () => {
    const totals = dayTotals(tracker);
    expect(totals[2]).toEqual({ day: 3, prayed: 1, state: "past" });
    expect(totals[3]).toEqual({ day: 4, prayed: 1, state: "open" });
    expect(totals[4].state).toBe("locked");
  });
});

describe("summaries", () => {
  const tracker = sheet([...fullDays([1, 2]), [3, "Fajr"], [3, "Isha"], [4, "Fajr"]]);

  it("counts the month over the days fully past", () => {
    expect(monthSummary(tracker)).toEqual({ due: 15, prayed: 12, missed: 3, pct: 80, perfectDays: 2, perfectRun: 0, todayDone: 1, prayedSoFar: 13 });
    expect(monthSummary(sheet(fullDays([1, 2, 3]))).perfectRun).toBe(3);
    expect(monthSummary(sheet(fullDays([1, 2, 3, 4]))).perfectRun).toBe(4);
  });

  it("counts each prayer", () => {
    const fajr = prayerSummaries(tracker).find((p) => p.item === "Fajr");
    expect(fajr).toEqual({ item: "Fajr", prayed: 3, missed: 0, due: 3, pct: 100 });
    expect(prayerSummaries(tracker).find((p) => p.item === "Asr")?.missed).toBe(1);
  });

  it("sums the year and picks the best finished month", () => {
    const august = sheet(fullDays([1, 2, 3, 4]), { id: "a", month: 8, elapsedDays: 31, todayDay: null });
    const year = yearSummary([tracker, august], 2026);
    expect(year.months.map((m) => m.month)).toEqual([8, 9]);
    expect(year.best?.month).toBe(8);
    expect(yearSummary([tracker], 2025).months).toEqual([]);
  });
});

describe("insights", () => {
  it("says nothing was missed, or names the weak and strong prayers", () => {
    expect(monthInsights(sheet(fullDays([1, 2, 3])), null)[0]).toMatchObject({ key: "nothingMissed", n: 3 });
    const keys = monthInsights(sheet([...fullDays([1, 2]), [3, "Maghrib"]]), null).map((i) => i.key);
    expect(keys).toContain("mostMissed");
    expect(keys).toContain("strongest");
  });

  it("compares with the month before", () => {
    const previous = sheet(fullDays([1, 2]), { id: "p", month: 8, elapsedDays: 4, todayDay: null });
    const insight = monthInsights(sheet(fullDays([1, 2, 3])), previous).find((i) => i.key === "upFrom");
    expect(insight).toMatchObject({ pct: 100, previousPct: 50 });
  });
});

describe("hijriRange", () => {
  it("names the Hijri months a Gregorian month spans", () => {
    expect(hijriRange(2026, 9)).toMatch(/1448$/);
    expect(hijriRange(2026, 9)).toContain("–");
  });
});
