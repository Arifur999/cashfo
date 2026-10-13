import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveDateRange } from "./dateRangePresets";

const at = (iso: string) => vi.setSystemTime(new Date(iso));

describe("resolveDateRange", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("follows the Dhaka calendar, not UTC", () => {
    vi.useFakeTimers();
    // 1 Nov, 01:00 in Dhaka -- still 31 Oct in UTC.
    at("2026-10-31T19:00:00.000Z");
    expect(resolveDateRange("this-month")).toEqual({ dateFrom: "2026-11-01", dateTo: "2026-11-01" });
    expect(resolveDateRange("last-month")).toEqual({ dateFrom: "2026-10-01", dateTo: "2026-10-31" });
  });

  it("knows where last month ends, February and the year turn included", () => {
    vi.useFakeTimers();
    at("2028-03-10T06:00:00.000Z");
    expect(resolveDateRange("last-month")).toEqual({ dateFrom: "2028-02-01", dateTo: "2028-02-29" });
    at("2027-01-15T06:00:00.000Z");
    expect(resolveDateRange("last-month")).toEqual({ dateFrom: "2026-12-01", dateTo: "2026-12-31" });
    expect(resolveDateRange("this-year")).toEqual({ dateFrom: "2027-01-01", dateTo: "2027-01-15" });
  });

  it("passes a custom range through, and filters nothing otherwise", () => {
    expect(resolveDateRange("custom", "2026-01-01", "2026-01-31")).toEqual({ dateFrom: "2026-01-01", dateTo: "2026-01-31" });
    expect(resolveDateRange("all")).toEqual({});
    expect(resolveDateRange(undefined)).toEqual({});
  });
});
