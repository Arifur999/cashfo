import { describe, expect, it } from "vitest";
import { clockOf, DEFAULT_PRAYER_SETTINGS, minutesUntil, nextPrayer, prayerTimesFor } from "./prayerTimes";

describe("prayer times", () => {
  // Dhaka on 2 Oct 2026, Karachi method, Hanafi Asr -- the board's own day.
  const times = prayerTimesFor(DEFAULT_PRAYER_SETTINGS, "2026-10-02");

  it("works out the day's times in order", () => {
    const order = [times.Fajr, times.Sunrise, times.Dhuhr, times.Asr, times.Maghrib, times.Isha].map((time) => time.getTime());
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("lands near the board's Dhaka times", () => {
    const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
    const near = (time: Date, expected: string) => expect(Math.abs(minutes(clockOf(time)) - minutes(expected))).toBeLessThanOrEqual(3);
    near(times.Fajr, "04:35");
    near(times.Dhuhr, "11:49");
    near(times.Asr, "16:05");
    near(times.Maghrib, "17:46");
    near(times.Isha, "19:00");
  });

  it("puts Hanafi Asr later than Shafi'i", () => {
    const shafii = prayerTimesFor({ ...DEFAULT_PRAYER_SETTINGS, asrSchool: "SHAFII" }, "2026-10-02");
    expect(shafii.Asr.getTime()).toBeLessThan(times.Asr.getTime());
  });

  it("finds the next prayer, rolling over to tomorrow's Fajr", () => {
    const afternoon = new Date(times.Asr.getTime() - 53 * 60000);
    expect(nextPrayer(DEFAULT_PRAYER_SETTINGS, "2026-10-02", "2026-10-03", afternoon).prayer).toBe("Asr");
    expect(minutesUntil(times.Asr, afternoon)).toBe(53);
    const late = new Date(times.Isha.getTime() + 60000);
    expect(nextPrayer(DEFAULT_PRAYER_SETTINGS, "2026-10-02", "2026-10-03", late).prayer).toBe("Fajr");
  });
});
