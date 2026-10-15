import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// lib/date.ts reads the platform timezone when it loads, so pin it first --
// these cases are about Dhaka's calendar, whatever the machine running them
// has set.
let presets: typeof import("./dateRangePresets");
beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_APP_TIME_ZONE", "Asia/Dhaka");
  vi.resetModules();
  presets = await import("./dateRangePresets");
  // A cold import of the date helpers can outlast the default 10s hook
  // timeout on a busy machine, which skips every case in this file.
}, 60_000);
afterAll(() => {
  vi.unstubAllEnvs();
});

const at = (iso: string) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
};

describe("resolveDateRange", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("follows the Dhaka calendar, not UTC", () => {
    // 1 Nov, 01:00 in Dhaka -- still 31 Oct in UTC.
    at("2026-10-31T19:00:00.000Z");
    expect(presets.resolveDateRange("this-month")).toEqual({ dateFrom: "2026-11-01", dateTo: "2026-11-01" });
    expect(presets.resolveDateRange("last-month")).toEqual({ dateFrom: "2026-10-01", dateTo: "2026-10-31" });
  });

  it("knows where last month ends, February and the year turn included", () => {
    at("2028-03-10T06:00:00.000Z");
    expect(presets.resolveDateRange("last-month")).toEqual({ dateFrom: "2028-02-01", dateTo: "2028-02-29" });
    at("2027-01-15T06:00:00.000Z");
    expect(presets.resolveDateRange("last-month")).toEqual({ dateFrom: "2026-12-01", dateTo: "2026-12-31" });
    expect(presets.resolveDateRange("this-year")).toEqual({ dateFrom: "2027-01-01", dateTo: "2027-01-15" });
    expect(presets.resolveDateRange("last-year")).toEqual({ dateFrom: "2026-01-01", dateTo: "2026-12-31" });
  });

  it("passes a custom range through, and filters nothing otherwise", () => {
    expect(presets.resolveDateRange("custom", "2026-01-01", "2026-01-31")).toEqual({ dateFrom: "2026-01-01", dateTo: "2026-01-31" });
    expect(presets.resolveDateRange("all")).toEqual({});
    expect(presets.resolveDateRange(undefined)).toEqual({});
  });
});

describe("the current month", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is Dhaka's, first day to last", () => {
    at("2026-10-31T19:00:00.000Z");
    expect(presets.appYearMonth()).toEqual({ year: 2026, month: 11 });
    expect(presets.appMonthRange()).toEqual({ from: "2026-11-01", to: "2026-11-30" });
  });
});

describe("isIsoDay", () => {
  it("accepts real calendar days only", () => {
    expect(presets.isIsoDay("2028-02-29")).toBe(true);
    expect(presets.isIsoDay("2027-02-29")).toBe(false);
    expect(presets.isIsoDay("2026-13-01")).toBe(false);
    expect(presets.isIsoDay("x")).toBe(false);
    expect(presets.isIsoDay(undefined)).toBe(false);
  });
});
