import { describe, expect, it } from "vitest";
import { goalBadge, goalColor, monthsLeft, quickAmounts, remainingOf, savingsPalette, SAVINGS_PALETTES } from "./savingsDisplay";

describe("goalBadge", () => {
  it("reads the pace of an active goal", () => {
    expect(goalBadge({ status: "ACTIVE", paceStatus: "ON_TRACK" })).toEqual({ label: "On track", chip: "income" });
    expect(goalBadge({ status: "ACTIVE", paceStatus: "BEHIND" })).toEqual({ label: "Behind", chip: "warning" });
    expect(goalBadge({ status: "ACTIVE", paceStatus: "WARNING" })).toEqual({ label: "At risk", chip: "expense" });
    expect(goalBadge({ status: "ACTIVE", paceStatus: null }).label).toBe("On track");
  });

  it("names any other status", () => {
    expect(goalBadge({ status: "PAUSED", paceStatus: null })).toEqual({ label: "Paused", chip: "neutral" });
    expect(goalBadge({ status: "COMPLETED", paceStatus: null })).toEqual({ label: "Completed", chip: "income" });
    expect(goalBadge({ status: "WITHDRAWN", paceStatus: null })).toEqual({ label: "Withdrawn", chip: "neutral" });
  });
});

describe("goalColor", () => {
  it("cycles the ring colours and greys a paused goal", () => {
    expect(goalColor(0, "ACTIVE")).toBe(goalColor(5, "ACTIVE"));
    expect(goalColor(1, "ACTIVE")).not.toBe(goalColor(2, "ACTIVE"));
    expect(goalColor(0, "PAUSED")).toBe("var(--ink-muted)");
  });
});

describe("monthsLeft", () => {
  it("counts whole months until the target", () => {
    expect(monthsLeft("2027-06-30T00:00:00.000Z", "2026-10-02")).toBe(8);
    expect(monthsLeft("2027-01-31", "2026-10-02")).toBe(3);
    expect(monthsLeft("2026-10-20", "2026-10-02")).toBe(0);
  });

  it("is never negative", () => {
    expect(monthsLeft("2026-01-01", "2026-10-02")).toBe(0);
  });
});

describe("quickAmounts", () => {
  it("offers the monthly target, round figures and the rest, each once", () => {
    const goal = { targetAmount: "150000", currentAmount: "80000", monthlyTarget: "7777.78" };
    expect(quickAmounts(goal)).toEqual([
      { kind: "monthly", amount: 7778 },
      { kind: "round", amount: 5000 },
      { kind: "round", amount: 10000 },
      { kind: "rest", amount: 70000 },
    ]);
    expect(remainingOf(goal)).toBe(70000);
  });

  it("drops zeros and duplicates", () => {
    const goal = { targetAmount: "10000", currentAmount: "10000", monthlyTarget: "0" };
    expect(quickAmounts(goal)).toEqual([
      { kind: "round", amount: 5000 },
      { kind: "round", amount: 10000 },
    ]);
    expect(quickAmounts({ targetAmount: "15000", currentAmount: "5000", monthlyTarget: "10000" }).filter((q) => q.amount === 10000)).toHaveLength(1);
  });
});

describe("savingsPalette", () => {
  it("cycles the savings colours", () => {
    expect(savingsPalette(0)).toBe(SAVINGS_PALETTES[0]);
    expect(savingsPalette(4)).toBe(SAVINGS_PALETTES[0]);
  });
});
