import { describe, expect, it } from "vitest";
import type { Translate } from "@/lib/i18n/message";
import { calendarDay, dateTimeLabel, dayLabel, daySpan, logTimeLabel, monthLabel, relativeDayLabel, shortMonth } from "./dashboardDates";

// The words a Bangla reader gets, enough for these checks.
const BANGLA: Record<string, string> = { "Today, {time}": "আজ, {time}", "Yesterday, {time}": "গতকাল, {time}", Yesterday: "গতকাল", October: "অক্টোবর", "{month} {year}": "{month} {year}" };
const toBangla: Translate = (key, values) => {
  const text = BANGLA[key] ?? key;
  return values ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match)) : text;
};

// 10:00 in Dhaka on 21 Oct 2026.
const now = new Date("2026-10-21T04:00:00Z");

describe("calendar days", () => {
  it("writes an axis day and a range in either language", () => {
    expect(calendarDay("2026-10-05", "en")).toBe("5 Oct");
    expect(calendarDay("2026-10-05", "bn")).toBe("৫ অক্টো");
    expect(daySpan("2026-09-02", "2026-10-01", "en")).toBe("2 Sep – 1 Oct");
    expect(daySpan("2026-09-02", "2026-10-01", "bn")).toBe("২ সেপ্টে – ১ অক্টো");
  });
});

describe("the day something happened", () => {
  it("reads the day in the platform's time zone", () => {
    // 20:30 UTC on the 13th is already the 14th in Dhaka.
    expect(dayLabel("2026-10-13T20:30:00Z", "en", now)).toBe("14 Oct");
    expect(dayLabel("2026-10-13T20:30:00Z", "bn", now)).toBe("১৪ অক্টো");
  });

  it("adds the year for another year", () => {
    expect(dayLabel("2025-06-02T06:00:00Z", "en", now)).toBe("2 Jun 2025");
    expect(dayLabel("2025-06-02T06:00:00Z", "bn", now)).toBe("২ জুন ২০২৫");
    expect(dayLabel(null, "en", now)).toBe("—");
  });

  it("says today and yesterday in words, else the day and the time", () => {
    expect(dateTimeLabel("2026-10-21T08:10:00Z", "en", { now })).toBe("Today, 2:10 pm");
    expect(dateTimeLabel("2026-10-21T08:10:00Z", "bn", { now, t: toBangla })).toBe("আজ, ২:১০ অপরাহ্ণ");
    expect(dateTimeLabel("2026-10-20T12:55:00Z", "en", { now })).toBe("Yesterday, 6:55 pm");
    expect(dateTimeLabel("2026-10-14T08:10:00Z", "bn", { now, t: toBangla })).toBe("১৪ অক্টো, ২:১০ অপরাহ্ণ");
  });

  it("names the day something last happened", () => {
    expect(relativeDayLabel("2026-10-21T08:10:00Z", "en", { now })).toBe("Today, 2:10 pm");
    expect(relativeDayLabel("2026-10-20T08:10:00Z", "bn", { now, t: toBangla })).toBe("গতকাল");
    expect(relativeDayLabel("2026-09-30T08:10:00Z", "bn", { now, t: toBangla })).toBe("৩০ সেপ্টে");
    expect(relativeDayLabel(undefined, "en", { now })).toBe("—");
  });

  it("gives a log row only the time while it is today", () => {
    expect(logTimeLabel("2026-10-21T08:10:00Z", "en", { now })).toBe("2:10 pm");
    expect(logTimeLabel("2026-10-14T08:10:00Z", "en", { now })).toBe("14 Oct, 2:10 pm");
    expect(logTimeLabel("", "en", { now })).toBe("—");
    // One digit set in Bangla: the time and its am/pm too.
    expect(logTimeLabel("2026-10-21T08:10:00Z", "bn", { now, t: toBangla })).toBe("২:১০ অপরাহ্ণ");
    expect(relativeDayLabel("2026-10-21T08:10:00Z", "bn", { now, t: toBangla })).toBe("আজ, ২:১০ অপরাহ্ণ");
  });
});

describe("months", () => {
  it("names a bar's month short", () => {
    expect(shortMonth("2026-10", "en")).toBe("Oct");
    expect(shortMonth("2026-09", "bn")).toBe("সেপ্টে");
    expect(shortMonth("2026-05", "bn")).toBe("মে");
  });

  it("adds the year when a list runs over more than one", () => {
    expect(monthLabel("2026-10", "en")).toBe("October");
    expect(monthLabel("2025-10", "en", undefined, true)).toBe("October 2025");
    expect(monthLabel("2025-10", "bn", toBangla, true)).toBe("অক্টোবর ২০২৫");
  });
});
