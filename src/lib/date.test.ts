import { describe, expect, it } from "vitest";
import { banglaDayMonth, banglaShortDay } from "./i18n/banglaDates";
import {
  dateTimeInputToIso,
  endOfDayIso,
  formatDate,
  formatDateTime,
  formatDayName,
  formDayLabel,
  formatElapsed,
  formatLogTime,
  formatRecentDateTime,
  formatRelativeDateTime,
  formatRelativeDay,
  formatTimeRange,
  startOfDayIso,
  toDateInputValue,
  toDateTimeInputValue,
} from "./date";

describe("formatDate", () => {
  it("renders in Asia/Dhaka regardless of the machine timezone", () => {
    // 20:30 UTC on Oct 10 is already Oct 11 in Dhaka (UTC+6).
    expect(formatDate("2026-10-10T20:30:00.000Z")).toBe("Oct 11, 2026");
  });

  it("falls back for empty or invalid input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not a date")).toBe("—");
  });

  it("writes the same pattern in Bangla, digits and all", () => {
    expect(formatDate("2026-10-10T20:30:00.000Z", "d MMM yyyy", "—", "bn")).toBe("১১ অক্টো ২০২৬");
    expect(formatDate("2026-10-10T20:30:00.000Z", undefined, "—", "bn")).toBe("অক্টো ১১, ২০২৬");
    expect(formatDate("2026-10-11T08:10:00Z", "EEEE, d MMMM yyyy, h:mm aaa", "—", "bn")).toBe("রবিবার, ১১ অক্টোবর ২০২৬, ২:১০ অপরাহ্ণ");
    expect(formatDate("2026-10-11T03:30:00Z", "EEE, d MMM, h:mm aaa", "—", "bn")).toBe("রবি, ১১ অক্টো, ৯:৩০ পূর্বাহ্ণ");
    expect(formatDate("2026-10-10T20:30:00.000Z", "do MMMM", "—", "bn")).toBe("১১ অক্টোবর");
    expect(formatDateTime("2026-10-11T03:30:00Z", "—", "bn")).toBe("অক্টো ১১, ২০২৬, ০৯:৩০ পূর্বাহ্ণ");
    expect(formatDate(null, "d MMM", "—", "bn")).toBe("—");
  });

  // So a page that writes its Bangla days by hand can switch with no change.
  it("writes a day as the board's Bangla helpers do", () => {
    expect(formatDate("2026-09-30T00:00:00.000Z", "d MMM", "—", "bn")).toBe(banglaDayMonth("2026-09-30"));
    expect(formatDate("2026-10-01T00:00:00.000Z", "EEE, d MMM", "—", "bn")).toBe(banglaShortDay("2026-10-01"));
  });

  it("keeps English as it was", () => {
    expect(formatDate("2026-10-11T08:10:00Z", "EEE, d MMM yyyy, h:mm aaa", "—", "en")).toBe("Sun, 11 Oct 2026, 2:10 pm");
    expect(formatDateTime("2026-10-11T03:30:00Z")).toBe("Oct 11, 2026, 09:30 AM");
  });
});

describe("startOfDayIso / endOfDayIso", () => {
  it("brackets a calendar day in Dhaka time", () => {
    expect(startOfDayIso("2026-10-31")).toBe("2026-10-30T18:00:00.000Z");
    expect(endOfDayIso("2026-10-31")).toBe("2026-10-31T17:59:59.999Z");
  });

  it("round-trips through toDateInputValue", () => {
    expect(toDateInputValue(endOfDayIso("2026-10-31"))).toBe("2026-10-31");
    expect(toDateInputValue(startOfDayIso("2026-01-01"))).toBe("2026-01-01");
  });
});

describe("dateTimeInputToIso / toDateTimeInputValue", () => {
  it("reads a datetime-local value as Dhaka time", () => {
    expect(dateTimeInputToIso("2026-10-11T09:30")).toBe("2026-10-11T03:30:00.000Z");
  });

  it("crosses the date line correctly", () => {
    expect(dateTimeInputToIso("2026-10-11T02:00")).toBe("2026-10-10T20:00:00.000Z");
  });

  it("round-trips through toDateTimeInputValue", () => {
    expect(toDateTimeInputValue("2026-10-11T03:30:00.000Z")).toBe("2026-10-11T09:30");
    expect(toDateTimeInputValue(dateTimeInputToIso("2026-12-31T23:59"))).toBe("2026-12-31T23:59");
  });

  it("gives an empty value for no date", () => {
    expect(toDateTimeInputValue(null)).toBe("");
  });
});

describe("formatRelativeDay", () => {
  const now = new Date("2026-10-02T06:00:00Z"); // 12:00 in Dhaka

  it("says today with the time, yesterday, or the date", () => {
    expect(formatRelativeDay("2026-10-02T05:42:00Z", { now })).toBe("Today, 11:42 am");
    expect(formatRelativeDay("2026-10-01T10:00:00Z", { now })).toBe("Yesterday");
    expect(formatRelativeDay("2026-09-30T10:00:00Z", { now })).toBe("30 Sep");
    expect(formatRelativeDay("2025-06-02T10:00:00Z", { now })).toBe("2 Jun 2025");
    expect(formatRelativeDay(null, { now })).toBe("—");
  });

  it("writes the day in Bangla when told the locale", () => {
    expect(formatRelativeDay("2026-09-30T10:00:00Z", { now, locale: "bn" })).toBe("৩০ সেপ্টে");
    expect(formatRelativeDay("2025-06-02T10:00:00Z", { now, locale: "bn" })).toBe("২ জুন ২০২৫");
    expect(formatRelativeDay("2026-10-02T05:42:00Z", { now, locale: "bn" })).toBe("Today, ১১:৪২ পূর্বাহ্ণ");
  });
});

describe("formatElapsed", () => {
  const now = new Date("2026-10-02T06:00:00Z");

  it("counts minutes, then hours up to two days, then days", () => {
    expect(formatElapsed("2026-10-02T05:25:00Z", { now })).toBe("35 min");
    expect(formatElapsed("2026-10-02T04:00:00Z", { now })).toBe("2 h");
    expect(formatElapsed("2026-10-01T04:00:00Z", { now })).toBe("26 h");
    expect(formatElapsed("2026-09-30T06:00:00Z", { now })).toBe("2 days");
    expect(formatElapsed(null, { now })).toBe("—");
  });

  it("counts in the reader's digits when told the locale", () => {
    const t = (key: string, values?: Record<string, string | number>) => `<${key}>${values ? JSON.stringify(values) : ""}`;
    expect(formatElapsed("2026-10-02T05:25:00Z", { now, t, locale: "bn" })).toBe('<{count} min>{"count":"৩৫"}');
    expect(formatElapsed("2026-10-01T04:00:00Z", { now, t, locale: "bn" })).toBe('<{count} h>{"count":"২৬"}');
    expect(formatElapsed("2026-09-30T06:00:00Z", { now, t, locale: "bn" })).toBe('<{count} days>{"count":"২"}');
    expect(formatElapsed("2023-10-02T06:00:00Z", { now, locale: "en" })).toBe("1,096 days");
  });
});

describe("formatRelativeDateTime", () => {
  const now = new Date("2026-10-02T06:00:00Z"); // 12:00 in Dhaka

  it("always keeps the time, with the day relative when it is close", () => {
    expect(formatRelativeDateTime("2026-10-02T08:10:00Z", { now })).toBe("Today, 2:10 pm");
    expect(formatRelativeDateTime("2026-10-01T12:55:00Z", { now })).toBe("Yesterday, 6:55 pm");
    expect(formatRelativeDateTime("2026-09-27T07:03:00Z", { now })).toBe("27 Sep, 1:03 pm");
    expect(formatRelativeDateTime("2025-09-27T07:03:00Z", { now })).toBe("27 Sep 2025, 1:03 pm");
    expect(formatRelativeDateTime(null, { now })).toBe("—");
  });

  it("can keep the seconds, as an audit entry does", () => {
    expect(formatRelativeDateTime("2026-10-02T07:05:12Z", { now, withSeconds: true })).toBe("Today, 1:05:12 pm");
  });

  it("asks t for the words and leaves the time as it is", () => {
    const t = (key: string, values?: Record<string, string | number>) => `<${key}>${values ? JSON.stringify(values) : ""}`;
    expect(formatRelativeDateTime("2026-10-02T08:10:00Z", { now, t })).toBe('<Today, {time}>{"time":"2:10 pm"}');
    expect(formatRelativeDateTime("2026-10-01T12:55:00Z", { now, t })).toBe('<Yesterday, {time}>{"time":"6:55 pm"}');
    expect(formatElapsed("2026-10-02T05:25:00Z", { now, t })).toBe('<{count} min>{"count":35}');
    expect(formatDayName("2026-10-01T03:00:00Z", { now, t })).toBe("<Yesterday>");
  });

  it("writes the time and the day in Bangla when told the locale", () => {
    const t = (key: string, values?: Record<string, string | number>) => `<${key}>${values ? JSON.stringify(values) : ""}`;
    expect(formatRelativeDateTime("2026-10-02T08:10:00Z", { now, t, locale: "bn" })).toBe('<Today, {time}>{"time":"২:১০ অপরাহ্ণ"}');
    expect(formatRelativeDateTime("2026-09-27T07:03:00Z", { now, locale: "bn" })).toBe("২৭ সেপ্টে, ১:০৩ অপরাহ্ণ");
    expect(formatRelativeDateTime("2025-09-27T07:03:00Z", { now, locale: "bn", withSeconds: true })).toBe("২৭ সেপ্টে ২০২৫, ১:০৩:০০ অপরাহ্ণ");
  });
});

describe("formatDayName / formatLogTime / formatTimeRange", () => {
  const now = new Date("2026-10-02T09:00:00Z"); // 3:00 pm in Dhaka

  it("keeps the time only while it is recent", () => {
    expect(formatRecentDateTime("2026-10-02T08:48:00Z", { now })).toBe("Today, 2:48 pm");
    expect(formatRecentDateTime("2026-10-01T11:10:00Z", { now })).toBe("Yesterday, 5:10 pm");
    expect(formatRecentDateTime("2026-09-28T05:00:00Z", { now })).toBe("28 Sep");
  });

  it("names the day alone", () => {
    expect(formatDayName("2026-10-02T03:00:00Z", { now })).toBe("Today");
    expect(formatDayName("2026-10-01T03:00:00Z", { now })).toBe("Yesterday");
    expect(formatDayName("2026-09-28T03:00:00Z", { now })).toBe("28 Sep");
  });

  it("leaves the day out of a log time while it is today", () => {
    expect(formatLogTime("2026-10-02T08:48:00Z", { now })).toBe("2:48 pm");
    expect(formatLogTime("2026-10-01T12:55:00Z", { now })).toBe("Yesterday, 6:55 pm");
    expect(formatLogTime(null, { now })).toBe("—");
  });

  it("shows a burst of tries as one span", () => {
    expect(formatTimeRange("2026-10-02T08:43:00Z", "2026-10-02T08:47:00Z", { now })).toBe("2:43 – 2:47 pm");
    expect(formatTimeRange("2026-10-02T05:50:00Z", "2026-10-02T06:10:00Z", { now })).toBe("11:50 am – 12:10 pm");
    expect(formatTimeRange("2026-10-01T13:30:00Z", "2026-10-01T13:42:00Z", { now })).toBe("Yesterday, 7:30 – 7:42 pm");
    expect(formatTimeRange("2026-10-02T08:43:10Z", "2026-10-02T08:43:50Z", { now })).toBe("2:43 pm");
  });

  it("does all of it in Bangla when told the locale", () => {
    expect(formatRecentDateTime("2026-09-28T05:00:00Z", { now, locale: "bn" })).toBe("২৮ সেপ্টে");
    expect(formatDayName("2026-09-28T03:00:00Z", { now, locale: "bn" })).toBe("২৮ সেপ্টে");
    expect(formatLogTime("2026-10-02T08:48:00Z", { now, locale: "bn" })).toBe("২:৪৮ অপরাহ্ণ");
    expect(formatTimeRange("2026-10-02T08:43:00Z", "2026-10-02T08:47:00Z", { now, locale: "bn" })).toBe("২:৪৩ – ২:৪৭ অপরাহ্ণ");
    // পূর্বাহ্ণ and অপরাহ্ণ end alike; a span across noon keeps both.
    expect(formatTimeRange("2026-10-02T05:50:00Z", "2026-10-02T06:10:00Z", { now, locale: "bn" })).toBe("১১:৫০ পূর্বাহ্ণ – ১২:১০ অপরাহ্ণ");
  });
});

describe("formDayLabel", () => {
  it("writes today with its date, any other day in full", () => {
    expect(formDayLabel("2026-10-02", "2026-10-02", "Today")).toBe("Today, 2 Oct");
    expect(formDayLabel("2026-09-30", "2026-10-02", "Today")).toBe("30 Sep 2026");
    expect(formDayLabel("2027-06-30", "2026-10-02", "আজ")).toBe("30 Jun 2027");
    expect(formDayLabel("2026-10-02", "2026-10-02", "আজ")).toBe("আজ, 2 Oct");
  });

  it("writes the date in Bangla too when told the locale", () => {
    expect(formDayLabel("2026-10-02", "2026-10-02", "আজ", "bn")).toBe("আজ, ২ অক্টো");
    expect(formDayLabel("2026-09-30", "2026-10-02", "আজ", "bn")).toBe("৩০ সেপ্টে ২০২৬");
    expect(formDayLabel("2027-06-30", "2026-10-02", "আজ", "bn")).toBe("৩০ জুন ২০২৭");
    expect(formDayLabel("", "2026-10-02", "আজ", "bn")).toBe("");
  });

  it("is empty when no day is picked", () => {
    expect(formDayLabel("", "2026-10-02", "Today")).toBe("");
  });
});
