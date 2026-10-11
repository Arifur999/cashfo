import { describe, expect, it } from "vitest";
import { dateTimeInputToIso, endOfDayIso, formatDate, startOfDayIso, toDateInputValue, toDateTimeInputValue } from "./date";

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
