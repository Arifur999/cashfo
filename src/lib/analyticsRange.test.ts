import { describe, expect, it } from "vitest";
import { MAX_RANGE_DAYS, rangeDays, resolveAnalyticsRange, shiftDay, toAnalyticsRangeQuery } from "./analyticsRange";

const TODAY = "2026-10-11";

describe("shiftDay", () => {
  it("moves across month and year boundaries", () => {
    expect(shiftDay("2026-10-11", -29)).toBe("2026-09-12");
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("resolveAnalyticsRange", () => {
  it("defaults to the last 30 days, today included", () => {
    expect(resolveAnalyticsRange({}, TODAY)).toEqual({ preset: "30", from: "2026-09-12", to: TODAY });
  });

  it("resolves the 7 and 90 day presets", () => {
    expect(resolveAnalyticsRange({ range: "7" }, TODAY)).toEqual({ preset: "7", from: "2026-10-05", to: TODAY });
    expect(resolveAnalyticsRange({ range: "90" }, TODAY).from).toBe("2026-07-14");
  });

  it("accepts a valid custom window", () => {
    expect(resolveAnalyticsRange({ range: "custom", from: "2026-08-01", to: "2026-08-31" }, TODAY)).toEqual({
      preset: "custom",
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });

  it("falls back to 30 days for a broken custom window", () => {
    expect(resolveAnalyticsRange({ range: "custom", from: "2026-08-31", to: "2026-08-01" }, TODAY).preset).toBe("30");
    expect(resolveAnalyticsRange({ range: "custom", from: "2026-08-01" }, TODAY).preset).toBe("30");
    expect(resolveAnalyticsRange({ range: "custom", from: "2026-13-01", to: "2026-13-02" }, TODAY).preset).toBe("30");
    expect(resolveAnalyticsRange({ range: "custom", from: "2026-10-01", to: "2026-12-01" }, TODAY).preset).toBe("30");
  });

  it("ignores an unknown preset", () => {
    expect(resolveAnalyticsRange({ range: "365" }, TODAY).preset).toBe("30");
  });

  it("keeps a custom window the API takes and drops a longer one for the last 30 days", () => {
    expect(rangeDays("2025-10-11", TODAY)).toBe(MAX_RANGE_DAYS);
    expect(resolveAnalyticsRange({ range: "custom", from: "2025-10-11", to: TODAY }, TODAY)).toEqual({ preset: "custom", from: "2025-10-11", to: TODAY });
    expect(resolveAnalyticsRange({ range: "custom", from: "2025-10-10", to: TODAY }, TODAY)).toEqual({ preset: "30", from: "2026-09-12", to: TODAY });
  });
});

describe("rangeDays", () => {
  it("counts both ends, across months and leap years", () => {
    expect(rangeDays(TODAY, TODAY)).toBe(1);
    expect(rangeDays("2026-09-12", TODAY)).toBe(30);
    expect(rangeDays("2026-01-01", "2026-12-31")).toBe(365);
    expect(rangeDays("2024-01-01", "2024-12-31")).toBe(366);
  });
});

describe("toAnalyticsRangeQuery", () => {
  it("serializes the window for the API", () => {
    expect(toAnalyticsRangeQuery({ preset: "7", from: "2026-10-05", to: TODAY })).toBe("from=2026-10-05&to=2026-10-11");
  });
});
