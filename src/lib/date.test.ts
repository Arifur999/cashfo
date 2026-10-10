import { describe, expect, it } from "vitest";
import { endOfDayIso, formatDate, startOfDayIso, toDateInputValue } from "./date";

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
