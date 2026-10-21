import { describe, expect, it } from "vitest";
import { keptTableWidth } from "./columnWidths";

describe("keptTableWidth", () => {
  it("adds every track and its padding, and the minimum for the column that has none", () => {
    // Payments' grid: the id, the person (no width), plan, gateway, amount,
    // status, date, and the Retry column; 12px gaps, 20px at the edges.
    const tracks = [96, undefined, 110, 112, 110, 150, 122, 104];
    const columns = tracks.map((track, index) => ({ track, padding: index === 0 || index === tracks.length - 1 ? 26 : 12 }));
    expect(keptTableWidth(columns, 160, 720)).toBe(122 + 172 + 122 + 124 + 122 + 162 + 134 + 130);
  });

  it("gives each column without a width the flexible minimum", () => {
    expect(keptTableWidth([{ padding: 26 }, { padding: 26 }], 300, 0)).toBe(652);
  });

  it("never goes under the floor", () => {
    expect(keptTableWidth([{ track: 100, padding: 26 }, { padding: 26 }], 160, 720)).toBe(720);
    expect(keptTableWidth([], 160, 720)).toBe(720);
  });
});
