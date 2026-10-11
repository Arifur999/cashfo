import type { Row } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import { smartColumnFilterFn } from "./filterFns";

// Only getValue is used by the filter.
const rowWith = (value: unknown) => ({ getValue: () => value }) as unknown as Row<unknown>;
const matches = (cellValue: unknown, filterValue: unknown) =>
  smartColumnFilterFn(rowWith(cellValue), "column", filterValue, () => {});

describe("smartColumnFilterFn", () => {
  it("matches a faceted selection by equality", () => {
    expect(matches("ACTIVE", ["ACTIVE", "SUSPENDED"])).toBe(true);
    expect(matches("EXPIRED", ["ACTIVE"])).toBe(false);
  });

  it("matches a multi-valued cell when any of its values is selected", () => {
    expect(matches(["PERSONAL", "BUSINESS"], ["BUSINESS"])).toBe(true);
    expect(matches(["PERSONAL"], ["BUSINESS"])).toBe(false);
  });

  it("treats an empty selection as no filter", () => {
    expect(matches("ANYTHING", [])).toBe(true);
  });

  it("does a case-insensitive contains for text", () => {
    expect(matches("Monthly Pro", "pro")).toBe(true);
    expect(matches(null, "pro")).toBe(false);
  });

  it("keeps dates inside an inclusive day range", () => {
    expect(matches("2026-10-11T23:30:00", { from: "2026-10-01", to: "2026-10-11" })).toBe(true);
    expect(matches("2026-09-30T12:00:00", { from: "2026-10-01" })).toBe(false);
    expect(matches(null, { from: "2026-10-01" })).toBe(false);
  });

  it("auto-removes empty filter values", () => {
    const autoRemove = smartColumnFilterFn.autoRemove!;
    expect(autoRemove("")).toBe(true);
    expect(autoRemove([])).toBe(true);
    expect(autoRemove({ from: "", to: "" })).toBe(true);
    expect(autoRemove(["ACTIVE"])).toBe(false);
  });
});
