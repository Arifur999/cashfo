import { describe, expect, it } from "vitest";
import { flowBar, flowLines, summaryFacts, worth, worthBar, worthShare } from "./dashboardWorth";

const parts = { cash: 72_388, savings: 180_000, assets: 5_720_000, pawna: 123_000, dena: 600_000 };

describe("dashboardWorth", () => {
  it("adds up the net worth and each part's share as the board does", () => {
    expect(worth(parts)).toEqual({ own: 6_095_388, owe: 600_000, net: 5_495_388 });
    expect(["cash", "savings", "assets", "pawna", "dena"].map((key) => worthShare(parts, key as keyof typeof parts))).toEqual([1, 3, 94, 2, 10]);
    expect(worthBar(parts).map((bar) => bar.key)).toEqual(["cash", "savings", "assets", "pawna", "dena"]);
    expect(worthBar({ cash: 0, savings: 0, assets: 0, pawna: 0, dena: 0 })).toEqual([]);
  });

  it("nets the cash flow lines, money out below the middle", () => {
    const { lines, net } = flowLines({
      income: { amount: 120_500, count: 29 },
      expenses: { amount: 63_000, count: 40 },
      savings: { added: 20_000, takenOut: 0 },
      loans: { took: 0, gotBack: 0, gave: 0, paidBack: 0 },
      assets: { bought: 0, sold: 0 },
      gifts: { gave: 1_000, got: 0 },
      worthChange: 20_000,
    });
    expect(lines.map((line) => line.value)).toEqual([120_500, -63_000, -20_000, 0, 0, -1_000]);
    expect(net).toBe(36_500);
    expect(flowBar(-63_000, 120_500)).toEqual({ left: 50 - (63_000 / 120_500) * 50, width: (63_000 / 120_500) * 50 });
    expect(flowBar(120_500, 120_500)).toEqual({ left: 50, width: 50 });
  });

  it("states the summary's facts, leaving out a target or budget that isn't set", () => {
    expect(summaryFacts({ income: 120_500, expense: 63_000, biggest: { name: "House Rent", amount: 22_000 }, target: 130_000, budget: 70_000 })).toEqual({
      empty: false,
      kept: 48,
      biggest: { name: "House Rent", amount: 22_000 },
      target: 93,
      budget: 90,
    });
    expect(summaryFacts({ income: 0, expense: 0, biggest: null, target: null, budget: 0 })).toMatchObject({ empty: true, target: null, budget: null });
  });
});
