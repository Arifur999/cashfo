import { describe, expect, it } from "vitest";
import type { Asset } from "./api";
import { assetGain, assetsSummary, biggestChanges, gainChip, isStale, lastValued, sparkline, updateCount, valueByCategory, valueTrail } from "./assetDisplay";

const asset = (overrides: Partial<Asset>): Asset => ({
  id: overrides.name ?? "a",
  name: "Asset",
  category: "Land",
  purchaseDate: "2019-03-15",
  purchasePrice: "1800000",
  currentValue: "2250000",
  purchaseAccountId: "w",
  status: "ACTIVE",
  soldAt: null,
  soldPrice: null,
  soldAccountId: null,
  notes: null,
  createdAt: "2019-03-15T00:00:00.000Z",
  updatedAt: "2019-03-15T00:00:00.000Z",
  valueHistory: [{ id: "h0", value: "1800000", recordedAt: "2019-03-15T00:00:00.000Z", note: null }],
  ...overrides,
});

describe("assetGain and gainChip", () => {
  it("compares today's value with what was paid", () => {
    expect(assetGain(asset({}))).toEqual({ amount: 450000, percent: 25 });
    expect(gainChip(25)).toEqual({ tone: "income", label: "+25.0%" });
  });

  it("uses the sale price once sold, and reads a loss in red", () => {
    const sold = asset({ status: "SOLD", soldPrice: "120000", purchasePrice: "180000" });
    expect(assetGain(sold).amount).toBe(-60000);
    expect(gainChip(assetGain(sold).percent)).toEqual({ tone: "expense", label: "−33.3%" });
    expect(gainChip(0.02)).toEqual({ tone: "neutral", label: "0%" });
  });
});

describe("assetsSummary and valueByCategory", () => {
  const assets = [asset({ name: "Land" }), asset({ name: "Car", category: "Vehicle", purchasePrice: "1650000", currentValue: "1350000" }), asset({ name: "Bike", category: "Vehicle", status: "SOLD", soldPrice: "120000", soldAt: "2026-08-12" })];

  it("totals the owned assets and lists the sold ones", () => {
    const summary = assetsSummary(assets);
    expect(summary.owned.map((a) => a.name)).toEqual(["Land", "Car"]);
    expect(summary.totalValue).toBe(3600000);
    expect(summary.totalPaid).toBe(3450000);
    expect(summary.gain.amount).toBe(150000);
    expect(summary.sold.map((a) => a.name)).toEqual(["Bike"]);
  });

  it("splits today's value by category, biggest first", () => {
    const shares = valueByCategory(assetsSummary(assets).owned);
    expect(shares.map((s) => s.name)).toEqual(["Land", "Vehicle"]);
    expect(Math.round(shares[0].share)).toBe(63);
    expect(shares[1].count).toBe(1);
  });

  it("ranks the biggest moves either way", () => {
    expect(biggestChanges(assetsSummary(assets).owned).map((a) => a.name)).toEqual(["Land", "Car"]);
  });
});

describe("value checks", () => {
  const checked = asset({ valueHistory: [{ id: "h0", value: "1800000", recordedAt: "2019-03-15T00:00:00.000Z", note: null }, { id: "h1", value: "2250000", recordedAt: "2026-09-12T00:00:00.000Z", note: null }] });

  it("knows when the value was last checked and how often", () => {
    expect(lastValued(checked)).toBe("2026-09-12T00:00:00.000Z");
    expect(updateCount(checked)).toBe(1);
    expect(lastValued(asset({}))).toBeNull();
    expect(updateCount(asset({}))).toBe(0);
  });

  it("flags an owned asset not checked for six months", () => {
    expect(isStale(asset({}), "2026-10-02")).toBe(true);
    expect(isStale(checked, "2026-10-02")).toBe(false);
    expect(isStale(asset({ purchaseDate: "2026-08-01", valueHistory: [] }), "2026-10-02")).toBe(false);
    expect(isStale(asset({ status: "SOLD" }), "2026-10-02")).toBe(false);
  });

  it("lists the values an asset went through, purchase first", () => {
    expect(valueTrail(checked)).toEqual([1800000, 2250000]);
    expect(valueTrail(asset({ valueHistory: [] }))).toEqual([1800000]);
  });
});

describe("sparkline", () => {
  it("spreads the points across the width and closes the area", () => {
    const spark = sparkline([1, 3, 2], 130, 40, 4);
    expect(spark.line).toBe("4,36 65,4 126,20");
    expect(spark.area).toBe("4,36 65,4 126,20 126,40 4,40");
    expect(spark.lastX).toBe(126);
  });

  it("centres a single or flat value", () => {
    expect(sparkline([5]).line).toBe("65,20");
    expect(sparkline([5, 5]).line).toBe("4,20 126,20");
  });
});
