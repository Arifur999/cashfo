import { describe, expect, it } from "vitest";
import { monthsAfter, rangeName, rangeSpan, shareOfAccounts, shareOfWeek, weekChange } from "./analyticsWording";

describe("analytics wording", () => {
  it("names the window the charts cover", () => {
    expect(rangeSpan({ from: "2026-09-02", to: "2026-10-01" })).toBe("2 Sep – 1 Oct");
    expect(rangeName({ preset: "30", from: "2026-09-02", to: "2026-10-01" })).toBe("Last 30 days");
    expect(rangeName({ preset: "custom", from: "2026-09-02", to: "2026-10-01" })).toBe("2 Sep – 1 Oct");
  });

  it("sets the active figures against what they come from", () => {
    expect(shareOfAccounts(768, 1272)).toBe("60% of all 1,272 accounts");
    expect(shareOfAccounts(0, 0)).toBe("No accounts yet");
    expect(shareOfWeek(172, 486)).toBe("35% of the weekly number");
    expect(shareOfWeek(0, 0)).toBe("Nobody this week");
  });

  it("says how this week compares with the one before", () => {
    expect(weekChange(486, 477)).toEqual({ text: "+9 on the week before", tone: "up" });
    expect(weekChange(470, 477)).toEqual({ text: "−7 on the week before", tone: "down" });
    expect(weekChange(5, 5)).toEqual({ text: "Same as the week before", tone: "same" });
  });

  it("counts months from the month people joined", () => {
    expect(monthsAfter("2026-08", "2026-10")).toBe(2);
    expect(monthsAfter("2025-11", "2026-01")).toBe(2);
    expect(monthsAfter("2026-10", "2026-10")).toBe(0);
  });
});
