import { describe, expect, it } from "vitest";
import {
  dateTimeInputToIso,
  endOfDayIso,
  formatDate,
  formatDayName,
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
});
