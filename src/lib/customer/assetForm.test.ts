import { describe, expect, it } from "vitest";
import type { Asset } from "./api";
import { dateProblem, firstUpdateDay, lastValueDay, nameProblem, parseAmount } from "./assetForm";

const history = (days: string[]): Pick<Asset, "valueHistory" | "purchaseDate"> => ({
  purchaseDate: `${days[0]}T00:00:00.000Z`,
  valueHistory: days.map((day, index) => ({ id: `h${index}`, value: "1", recordedAt: `${day}T00:00:00.000Z`, note: null })),
});

describe("parseAmount", () => {
  it("takes digits with commas and up to two decimals", () => {
    expect(parseAmount("1,20,000", "Price")).toEqual({ value: 120000 });
    expect(parseAmount(" ৳ 2699.10 ", "Price")).toEqual({ value: 2699.1 });
  });

  it("says what is wrong, naming the field", () => {
    expect(parseAmount("", "Price")).toEqual({ problem: { key: "{label} is required.", values: { label: "Price" } } });
    expect(parseAmount("-5", "Price")).toEqual({ problem: { key: "{label} can’t be negative.", values: { label: "Price" } } });
    expect(parseAmount("12.345", "Sale price")).toEqual({ problem: { key: "Enter {label} in numbers only, like 25000.", values: { label: "sale price" } } });
    expect(parseAmount("0", "Price")).toEqual({ problem: { key: "{label} must be more than 0.", values: { label: "Price" } } });
    expect(parseAmount("1000000000000", "Price")).toEqual({ problem: { key: "{label} is too large.", values: { label: "Price" } } });
  });
});

describe("dateProblem", () => {
  it("wants a day no later than today and not before the one given", () => {
    expect(dateProblem("", "2026-11-12")).toEqual({ key: "Pick a date." });
    expect(dateProblem("2026-11-13", "2026-11-12")).toEqual({ key: "The date can’t be in the future." });
    expect(dateProblem("2026-01-01", "2026-11-12", { day: "2026-02-01", name: "the buy date", shown: "1 Feb 2026" })).toEqual({ key: "The date can’t be before {what} ({date}).", values: { what: "the buy date", date: "1 Feb 2026" } });
    expect(dateProblem("2026-02-01", "2026-11-12", { day: "2026-02-01", name: "the buy date", shown: "1 Feb 2026" })).toBeNull();
  });
});

describe("nameProblem", () => {
  const assets = [
    { id: "a", name: "Work laptop", status: "ACTIVE" as const },
    { id: "b", name: "Motorbike", status: "SOLD" as const },
  ];

  it("wants a name no other active asset has, in any letter case", () => {
    expect(nameProblem("  ", assets)).toEqual({ key: "Enter the asset name." });
    expect(nameProblem("x".repeat(61), assets)).toEqual({ key: "Keep the name under 60 characters." });
    expect(nameProblem("work LAPTOP", assets)).toEqual({ key: "You already have an active asset with this name." });
    expect(nameProblem("Work laptop", assets, "a")).toBeNull();
    expect(nameProblem("Motorbike", assets)).toBeNull();
  });
});

describe("value days", () => {
  it("knows the newest value and the first update after the purchase", () => {
    expect(lastValueDay(history(["2024-08-20", "2025-06-01", "2026-08-20"]))).toBe("2026-08-20");
    expect(firstUpdateDay(history(["2024-08-20", "2026-08-20", "2025-06-01"]))).toBe("2025-06-01");
    expect(firstUpdateDay(history(["2024-08-20"]))).toBeNull();
    expect(lastValueDay(history(["2024-08-20"]))).toBe("2024-08-20");
  });
});
