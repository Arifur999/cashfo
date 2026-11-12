import { describe, expect, it } from "vitest";
import type { Asset } from "./api";
import {
  assetSeries,
  lastUpdateMovers,
  portfolioSeries,
  recentValueChanges,
  sortAssets,
  valueOn,
  statementLines,
  tradeRows,
  assetGain,
  assetsSummary,
  gainChip,
  isInitialValueNote,
  isStale,
  lastValued,
  updateCount,
  valueByCategory,
  valueTimeline,
} from "./assetDisplay";

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
  const assets = [asset({ name: "Land" }), asset({ name: "Car", category: "Vehicle", purchasePrice: "1650000", currentValue: "1350000" }), asset({ name: "Bike", category: "Vehicle", status: "SOLD", purchasePrice: "180000", soldPrice: "120000", soldAt: "2026-08-12" })];

  it("totals the owned assets and lists the sold ones", () => {
    const summary = assetsSummary(assets);
    expect(summary.owned.map((a) => a.name)).toEqual(["Land", "Car"]);
    expect(summary.totalValue).toBe(3600000);
    expect(summary.totalPaid).toBe(3450000);
    expect(summary.gain.amount).toBe(150000);
    expect(summary.sold.map((a) => a.name)).toEqual(["Bike"]);
  });

  it("keeps what the sales made apart from the gain on what is still owned", () => {
    const summary = assetsSummary(assets);
    expect(summary.soldGain.amount).toBe(-60000);
    expect(Math.round(summary.soldGain.percent * 10) / 10).toBe(-33.3);
    expect(assetsSummary([asset({})]).soldGain).toEqual({ amount: 0, percent: 0 });
  });

  it("splits today's value by type, biggest first", () => {
    const shares = valueByCategory(assetsSummary(assets).owned);
    expect(shares.map((s) => s.name)).toEqual(["Land", "Vehicle"]);
    expect(Math.round(shares[0].share)).toBe(63);
    expect(shares[1].count).toBe(1);
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

  it("knows the backend's first-row notes", () => {
    expect(isInitialValueNote("Initial purchase value")).toBe(true);
    expect(isInitialValueNote("Initial value")).toBe(true);
    expect(isInitialValueNote("Mouza rate went up")).toBe(false);
    expect(isInitialValueNote(null)).toBe(false);
  });

});

describe("valueTimeline", () => {
  const history = asset({
    valueHistory: [
      { id: "h0", value: "1800000", recordedAt: "2019-03-15T00:00:00.000Z", note: "Initial purchase value" },
      { id: "h2", value: "2250000", recordedAt: "2026-09-12T00:00:00.000Z", note: null },
      { id: "h1", value: "2000000", recordedAt: "2024-01-10T00:00:00.000Z", note: "Mouza rate" },
    ],
  });

  it("runs newest first and marks the purchase as the first entry", () => {
    expect(valueTimeline(history).map((e) => [e.id, e.kind])).toEqual([
      ["h2", "past"],
      ["h1", "past"],
      ["h0", "first"],
    ]);
  });

  it("puts the value about to be saved in its place by date", () => {
    expect(valueTimeline(history, { date: "2026-10-21", value: 2400000, note: null }).map((e) => e.id)).toEqual(["new", "h2", "h1", "h0"]);
    expect(valueTimeline(history, { date: "2025-05-01", value: 2100000, note: null }).map((e) => e.id)).toEqual(["h2", "new", "h1", "h0"]);
    // On the same day as a recorded value, the new one is the newer.
    expect(valueTimeline(history, { date: "2026-09-12", value: 2300000, note: null }).map((e) => e.id)).toEqual(["new", "h2", "h1", "h0"]);
  });

  // Already owned, bought today and worth something else today: the
  // purchase and the value check share a date, and the backend may return
  // them either way round.
  const sameDay = asset({
    purchaseDate: "2026-10-21T00:00:00.000Z",
    purchasePrice: "50000",
    currentValue: "65000",
    valueHistory: [
      { id: "check", value: "65000", recordedAt: "2026-10-21T00:00:00.000Z", note: null },
      { id: "bought", value: "50000", recordedAt: "2026-10-21T00:00:00.000Z", note: "Initial value" },
    ],
  });
  const reversed = { ...sameDay, valueHistory: [...sameDay.valueHistory].reverse() };

  it("counts the purchase as the older of two rows on one day, whichever comes first", () => {
    for (const subject of [sameDay, reversed]) {
      expect(valueTimeline(subject).map((e) => [e.id, e.kind])).toEqual([
        ["check", "past"],
        ["bought", "first"],
      ]);
    }
  });
});

describe("tradeRows", () => {
  it("lists wallet purchases and sales, newest first, a sale before a purchase on one day", () => {
    const bought = asset({ id: "a", purchaseDate: "2026-01-05T00:00:00.000Z", purchaseAccountId: "cash", purchasePrice: "100.00" });
    const owned = asset({ id: "b", purchaseDate: "2026-02-01T00:00:00.000Z", purchaseAccountId: null as unknown as string });
    const sold = asset({ id: "c", purchaseDate: "2026-03-01T00:00:00.000Z", purchaseAccountId: "bank", status: "SOLD", soldAt: "2026-03-01T00:00:00.000Z", soldPrice: "250.00", soldAccountId: "cash" });
    expect(tradeRows([bought, owned, sold]).map((row) => [row.key, row.date, row.amount, row.accountId])).toEqual([
      ["c:sell", "2026-03-01", 250, "cash"],
      ["c:buy", "2026-03-01", Number(sold.purchasePrice), "bank"],
      ["a:buy", "2026-01-05", 100, "cash"],
    ]);
  });
});

describe("statementLines", () => {
  it("starts where the asset started and gives each update its change", () => {
    const lines = statementLines(
      asset({
        valueHistory: [
          { id: "2", value: "120.00", recordedAt: "2026-05-01T00:00:00.000Z", note: "Checked" },
          { id: "1", value: "100.00", recordedAt: "2026-01-01T00:00:00.000Z", note: "Initial purchase value" },
          { id: "3", value: "90.00", recordedAt: "2026-09-01T00:00:00.000Z", note: null },
        ] as Asset["valueHistory"],
      }),
    );
    expect(lines.map((line) => [line.id, line.previous, line.change, line.percent === null ? null : Math.round(line.percent)])).toEqual([
      ["1", null, null, null],
      ["2", 100, 20, 20],
      ["3", 120, -30, -25],
    ]);
  });
});

describe("the Dashboard's value chart", () => {
  const land = asset({
    id: "land",
    name: "Land",
    purchaseDate: "2024-03-01T00:00:00.000Z",
    purchasePrice: "100.00",
    valueHistory: [
      { id: "l1", value: "100.00", recordedAt: "2024-03-01T00:00:00.000Z", note: "Initial purchase value" },
      { id: "l2", value: "150.00", recordedAt: "2025-06-01T00:00:00.000Z", note: null },
    ] as Asset["valueHistory"],
  });
  const car = asset({ id: "car", name: "Car", purchaseDate: "2026-02-01T00:00:00.000Z", purchasePrice: "50.00", currentValue: "50.00", valueHistory: [] });

  it("reads an asset's value on a day, nothing before it was bought", () => {
    expect(valueOn(land, "2024-01-01")).toBeNull();
    expect(valueOn(land, "2024-12-31")).toBe(100);
    expect(valueOn(land, "2025-12-31")).toBe(150);
    expect(valueOn(car, "2026-03-01")).toBe(50);
  });

  it("totals each year's end and today, naming what was added", () => {
    expect(portfolioSeries([land, car], "2026-10-29").map((point) => [point.date, point.value, point.paid, point.added, point.today])).toEqual([
      ["2024-12-31", 100, 100, ["Land"], false],
      ["2025-12-31", 150, 100, [], false],
      ["2026-10-29", 200, 150, ["Car"], true],
    ]);
    expect(portfolioSeries([], "2026-10-29")).toEqual([]);
  });

  it("counts a sold asset until the day it was sold, and names the sale", () => {
    const bike = asset({ id: "bike", name: "Bike", status: "SOLD", purchaseDate: "2025-01-10T00:00:00.000Z", purchasePrice: "40.00", currentValue: "40.00", soldAt: "2026-08-12T00:00:00.000Z", soldPrice: "30.00", valueHistory: [] });
    expect(portfolioSeries([land, bike], "2026-10-29").map((point) => [point.date, point.value, point.paid, point.added, point.sold])).toEqual([
      ["2024-12-31", 100, 100, ["Land"], []],
      ["2025-12-31", 190, 140, ["Bike"], []],
      ["2026-10-29", 150, 100, [], ["Bike"]],
    ]);
  });

  it("skips years when there are many, keeping the last year and today", () => {
    const old = asset({ id: "old", name: "Old", purchaseDate: "2000-05-01T00:00:00.000Z", purchasePrice: "10.00", currentValue: "10.00", valueHistory: [] });
    const days = portfolioSeries([old], "2026-10-29").map((point) => point.date);
    expect(days.length).toBeLessThanOrEqual(10);
    expect(days.slice(-2)).toEqual(["2025-12-31", "2026-10-29"]);
  });

  it("starts at the first purchase when everything was bought this year", () => {
    expect(portfolioSeries([car], "2026-10-29").map((point) => [point.date, point.value, point.added])).toEqual([
      ["2026-02-01", 50, ["Car"]],
      ["2026-10-29", 50, []],
    ]);
  });

  it("ends a sold asset's own line at its sale", () => {
    const sold = asset({ ...land, status: "SOLD", soldAt: "2026-03-01T00:00:00.000Z", soldPrice: "120.00" });
    expect(assetSeries(sold).map((point) => [point.date, point.value, point.paid, point.sold, point.today])).toEqual([
      ["2024-03-01", 100, 100, [], false],
      ["2025-06-01", 150, 100, [], false],
      ["2026-03-01", 120, 100, ["Land"], false],
    ]);
    expect(assetSeries(land).at(-1)?.today).toBe(true);
  });

  it("lists the latest value updates and sales, and the biggest moves at the last update", () => {
    const laptop = asset({
      id: "laptop",
      name: "Laptop",
      purchaseDate: "2024-08-01T00:00:00.000Z",
      purchasePrice: "200.00",
      valueHistory: [
        { id: "p1", value: "200.00", recordedAt: "2024-08-01T00:00:00.000Z", note: "Initial purchase value" },
        { id: "p2", value: "160.00", recordedAt: "2026-08-20T00:00:00.000Z", note: null },
      ] as Asset["valueHistory"],
    });
    const changes = recentValueChanges([land, laptop]);
    expect(changes.map((change) => [change.date, change.kind, change.from, change.to])).toEqual([
      ["2026-08-20", "update", 200, 160],
      ["2025-06-01", "update", 100, 150],
    ]);
    const { rise, drop } = lastUpdateMovers([land, laptop]);
    expect(rise?.asset.id).toBe("land");
    expect(drop?.asset.id).toBe("laptop");
    expect(lastUpdateMovers([car])).toEqual({ rise: null, drop: null });
  });

  it("sorts by gain, value or purchase date", () => {
    const up = asset({ id: "up", name: "Up", purchasePrice: "100.00", currentValue: "150.00", purchaseDate: "2020-01-01T00:00:00.000Z" });
    const down = asset({ id: "down", name: "Down", purchasePrice: "100.00", currentValue: "80.00", purchaseDate: "2022-01-01T00:00:00.000Z" });
    expect(sortAssets([down, up], "gain").map((a) => a.id)).toEqual(["up", "down"]);
    expect(sortAssets([up, down], "loss").map((a) => a.id)).toEqual(["down", "up"]);
    expect(sortAssets([up, down], "newest").map((a) => a.id)).toEqual(["down", "up"]);
    expect(sortAssets([down, up], "valueLow").map((a) => a.id)).toEqual(["down", "up"]);
  });
});
