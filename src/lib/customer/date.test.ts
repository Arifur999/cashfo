import { describe, expect, it } from "vitest";
import { formatTimeAgo } from "./date";

describe("formatTimeAgo", () => {
  const now = new Date("2026-10-18T12:00:00.000Z");

  it("counts minutes, hours and days back from now", () => {
    expect(formatTimeAgo("2026-10-18T11:59:40.000Z", undefined, now)).toBe("just now");
    expect(formatTimeAgo("2026-10-18T11:55:00.000Z", undefined, now)).toBe("5 minutes ago");
    expect(formatTimeAgo("2026-10-18T10:00:00.000Z", undefined, now)).toBe("2 hours ago");
    expect(formatTimeAgo("2026-10-17T11:00:00.000Z", undefined, now)).toBe("1 day ago");
    expect(formatTimeAgo("2026-10-15T12:00:00.000Z", undefined, now)).toBe("3 days ago");
  });

  it("falls back to the date after a month", () => {
    expect(formatTimeAgo("2026-08-01T12:00:00.000Z", undefined, now)).toBe("1 Aug 2026");
  });
});
