import { describe, expect, it } from "vitest";
import { inEnglish } from "@/lib/i18n/message";
import { formatTimeAgo, monthsSince, timeLabel } from "./date";

describe("formatTimeAgo", () => {
  const now = new Date("2026-10-18T12:00:00.000Z");

  it("counts minutes, hours and days back from now", () => {
    expect(formatTimeAgo("2026-10-18T11:59:40.000Z", undefined, "en", now)).toBe("just now");
    expect(formatTimeAgo("2026-10-18T11:55:00.000Z", undefined, "en", now)).toBe("5 minutes ago");
    expect(formatTimeAgo("2026-10-18T10:00:00.000Z", undefined, "en", now)).toBe("2 hours ago");
    expect(formatTimeAgo("2026-10-17T11:00:00.000Z", undefined, "en", now)).toBe("1 day ago");
    expect(formatTimeAgo("2026-10-15T12:00:00.000Z", undefined, "en", now)).toBe("3 days ago");
  });

  it("falls back to the date after a month", () => {
    expect(formatTimeAgo("2026-08-01T12:00:00.000Z", undefined, "en", now)).toBe("1 Aug 2026");
  });

  it("counts, and writes the date, in Bangla digits for a Bangla reader", () => {
    expect(formatTimeAgo("2026-10-18T11:55:00.000Z", inEnglish, "bn", now)).toBe("৫ minutes ago");
    expect(formatTimeAgo("2026-10-15T12:00:00.000Z", inEnglish, "bn", now)).toBe("৩ days ago");
    expect(formatTimeAgo("2026-08-01T12:00:00.000Z", inEnglish, "bn", now)).toBe("১ আগস্ট ২০২৬");
  });
});

describe("timeLabel", () => {
  it("reads a 24-hour time on a 12-hour clock", () => {
    expect(timeLabel("17:30", inEnglish)).toBe("5:30 pm");
    expect(timeLabel("00:05", inEnglish, "en")).toBe("12:05 am");
  });

  it("writes the clock in Bangla digits for a Bangla reader", () => {
    expect(timeLabel("17:42", inEnglish, "bn")).toBe("৫:৪২ pm");
    expect(timeLabel("12:00", inEnglish, "bn")).toBe("১২:০০ pm");
  });
});

describe("monthsSince", () => {
  it("counts whole months since a password changed", () => {
    const now = new Date("2026-10-02T00:00:00.000Z");
    expect(monthsSince("2025-08-02T00:00:00.000Z", now)).toBe(14);
    expect(monthsSince("2025-08-03T00:00:00.000Z", now)).toBe(13);
    expect(monthsSince("2026-09-20T00:00:00.000Z", now)).toBe(0);
  });
});
