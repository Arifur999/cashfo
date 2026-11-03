import { describe, expect, it } from "vitest";
import { periodHref, periodRange, readPickedPeriod } from "./period";

const NOW = { year: 2026, month: 1 };

describe("readPickedPeriod", () => {
  it("reads a month, a year and the reader's own days", () => {
    expect(readPickedPeriod({ month: "10", year: "2026" }, NOW)).toEqual({ kind: "month", month: 10, year: 2026 });
    expect(readPickedPeriod({ period: "year", year: "2025" }, NOW)).toEqual({ kind: "year", year: 2025 });
    expect(readPickedPeriod({ from: "2026-08-01", to: "2026-10-28" }, NOW)).toEqual({ kind: "custom", from: "2026-08-01", to: "2026-10-28" });
  });

  it("is all time with nothing asked, or anything it can't read", () => {
    expect(readPickedPeriod({}, NOW)).toEqual({ kind: "all" });
    expect(readPickedPeriod({ month: "13", year: "2026" }, NOW)).toEqual({ kind: "all" });
    expect(readPickedPeriod({ from: "2026-10-28", to: "2026-08-01" }, NOW)).toEqual({ kind: "all" });
    expect(readPickedPeriod({ period: "year", year: "1990" }, NOW)).toEqual({ kind: "all" });
    expect(readPickedPeriod({}, NOW, { kind: "month", month: 1, year: 2026 })).toEqual({ kind: "month", month: 1, year: 2026 });
  });

  it("opens the older Balance links as they meant", () => {
    expect(readPickedPeriod({ range: "this-month" }, NOW)).toEqual({ kind: "month", month: 1, year: 2026 });
    expect(readPickedPeriod({ range: "last-month" }, NOW)).toEqual({ kind: "month", month: 12, year: 2025 });
    expect(readPickedPeriod({ range: "this-year" }, NOW)).toEqual({ kind: "year", year: 2026 });
    expect(readPickedPeriod({ range: "custom", dateFrom: "2026-01-05", dateTo: "2026-01-20" }, NOW)).toEqual({ kind: "custom", from: "2026-01-05", to: "2026-01-20" });
    expect(readPickedPeriod({ range: "custom", start: "2025-11", end: "2026-01" }, NOW)).toEqual({ kind: "custom", from: "2025-11-01", to: "2026-01-31" });
    expect(readPickedPeriod({ range: "all" }, NOW)).toEqual({ kind: "all" });
  });
});

describe("periodRange", () => {
  it("is the first and last day, nothing for all time", () => {
    expect(periodRange({ kind: "month", month: 2, year: 2028 })).toEqual({ dateFrom: "2028-02-01", dateTo: "2028-02-29" });
    expect(periodRange({ kind: "year", year: 2025 })).toEqual({ dateFrom: "2025-01-01", dateTo: "2025-12-31" });
    expect(periodRange({ kind: "all" })).toEqual({});
  });
});

describe("periodHref", () => {
  it("keeps the rest of the address and starts at the first page", () => {
    const params = { account: "a-1", q: "rent", page: "3", range: "this-year" };
    expect(periodHref("/balance/transfer", params, { kind: "month", month: 9, year: 2026 })).toBe("/balance/transfer?account=a-1&q=rent&month=9&year=2026");
    expect(periodHref("/balance/transfer", params, { kind: "year", year: 2025 })).toBe("/balance/transfer?account=a-1&q=rent&period=year&year=2025");
    expect(periodHref("/balance/transfer", params, { kind: "custom", from: "2026-08-01", to: "2026-08-09" })).toBe("/balance/transfer?account=a-1&q=rent&from=2026-08-01&to=2026-08-09");
  });

  it("writes all time as nothing", () => {
    expect(periodHref("/balance/ledger", { accountId: "a-1", month: "9", year: "2026" }, { kind: "all" })).toBe("/balance/ledger?accountId=a-1");
    expect(periodHref("/balance/ledger", {}, { kind: "all" })).toBe("/balance/ledger");
  });
});
