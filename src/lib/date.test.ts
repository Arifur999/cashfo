import { describe, expect, it } from "vitest";
import {
  dateTimeInputToIso,
  endOfDayIso,
  formatDate,
  formatElapsed,
  formatRelativeDateTime,
  formatRelativeDay,
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
    expect(formatRelativeDay("2026-10-02T05:42:00Z", now)).toBe("Today, 11:42 am");
    expect(formatRelativeDay("2026-10-01T10:00:00Z", now)).toBe("Yesterday");
    expect(formatRelativeDay("2026-09-30T10:00:00Z", now)).toBe("30 Sep");
    expect(formatRelativeDay("2025-06-02T10:00:00Z", now)).toBe("2 Jun 2025");
    expect(formatRelativeDay(null, now)).toBe("—");
  });
});

describe("formatElapsed", () => {
  const now = new Date("2026-10-02T06:00:00Z");

  it("counts minutes, then hours up to two days, then days", () => {
    expect(formatElapsed("2026-10-02T05:25:00Z", now)).toBe("35 min");
    expect(formatElapsed("2026-10-02T04:00:00Z", now)).toBe("2 h");
    expect(formatElapsed("2026-10-01T04:00:00Z", now)).toBe("26 h");
    expect(formatElapsed("2026-09-30T06:00:00Z", now)).toBe("2 days");
    expect(formatElapsed(null, now)).toBe("—");
  });
});

describe("formatRelativeDateTime", () => {
  const now = new Date("2026-10-02T06:00:00Z"); // 12:00 in Dhaka

  it("always keeps the time, with the day relative when it is close", () => {
    expect(formatRelativeDateTime("2026-10-02T08:10:00Z", now)).toBe("Today, 2:10 pm");
    expect(formatRelativeDateTime("2026-10-01T12:55:00Z", now)).toBe("Yesterday, 6:55 pm");
    expect(formatRelativeDateTime("2026-09-27T07:03:00Z", now)).toBe("27 Sep, 1:03 pm");
    expect(formatRelativeDateTime("2025-09-27T07:03:00Z", now)).toBe("27 Sep 2025, 1:03 pm");
    expect(formatRelativeDateTime(null, now)).toBe("—");
  });
});
