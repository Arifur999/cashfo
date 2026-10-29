import { describe, expect, it } from "vitest";
import type { Asset, AssetCategoryOption } from "./api";
import {
  portfolioSeries,
  sortAssets,
  valueOn,
  statementLines,
  tradeRows,
  assetGain,
  assetsSummary,
  biggestChanges,
  categoryVisual,
  gainChip,
  isInitialValueNote,
  isStale,
  lastValued,
  latestPurchaseDay,
  newValueFloor,
  sparkline,
  typeChips,
  updateCount,
  valueByCategory,
  valueTimeline,
  valueTrail,
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

const type = (name: string, color = "green", icon: string | null = "mountain"): AssetCategoryOption => ({ id: name, name, icon, color, displayOrder: 0 });

describe("categoryVisual", () => {
  it("draws a type in its token colour, so dark mode follows", () => {
    expect(categoryVisual([type("Land", "green")], "Land").color).toBe("var(--cat-1)");
    expect(categoryVisual([type("Gold", "yellow")], "Gold").color).toBe("var(--cat-11)");
    // Every category ink, not only the first six.
    expect(categoryVisual([type("Shares", "purple")], "Shares").color).toBe("var(--cat-7)");
    expect(categoryVisual([type("Land", "green")], "Land").tone).toEqual({ bg: "bg-mint-50", fg: "text-cat-1" });
  });

  it("falls back to the neutral tile and the charts' grey for a type that is gone", () => {
    const gone = categoryVisual([type("Land")], "Boat");
    expect(gone.color).toBe("var(--chart-other)");
    expect(gone.tone.bg).toBe("bg-surface-sunken");
  });
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

  it("ranks the biggest moves either way", () => {
    expect(biggestChanges(assetsSummary(assets).owned).map((a) => a.name)).toEqual(["Land", "Car"]);
  });

  it("leaves out what hasn't moved, so the card never lists a 0% change", () => {
    const flat = asset({ name: "Bond", purchasePrice: "500000", currentValue: "500000" });
    const barely = asset({ name: "Gold", purchasePrice: "1000000", currentValue: "1000200" });
    expect(biggestChanges([flat, barely, ...assetsSummary(assets).owned]).map((a) => a.name)).toEqual(["Land", "Car"]);
    expect(biggestChanges([flat])).toEqual([]);
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

  it("dates a new value no earlier than the purchase, though older than the newest one", () => {
    // An earlier day only fills in the history; the backend keeps the
    // newest as the value today.
    expect(newValueFloor(checked)).toBe("2019-03-15");
    expect(newValueFloor(asset({}))).toBe("2019-03-15");
    expect(newValueFloor(asset({ purchaseDate: "2015-06-01T00:00:00.000Z" }))).toBe("2015-06-01");
  });

  it("lets the purchase date move up to the first value recorded after it", () => {
    expect(latestPurchaseDay(asset({}), "2026-10-21")).toBe("2026-10-21");
    expect(latestPurchaseDay(checked, "2026-10-21")).toBe("2026-09-12");
    // Added as already owned today at another value: both rows carry today,
    // and the check written then doesn't pin the date.
    const addedToday = asset({
      valueHistory: [
        { id: "h1", value: "2250000", recordedAt: "2026-10-21T00:00:00.000Z", note: null },
        { id: "h0", value: "1800000", recordedAt: "2026-10-21T00:00:00.000Z", note: "Initial value" },
      ],
    });
    expect(latestPurchaseDay(addedToday, "2026-10-21")).toBe("2026-10-21");
    expect(latestPurchaseDay(asset({ valueHistory: [] }), "2026-10-21")).toBe("2026-10-21");
  });

  it("knows the backend's first-row notes", () => {
    expect(isInitialValueNote("Initial purchase value")).toBe(true);
    expect(isInitialValueNote("Initial value")).toBe(true);
    expect(isInitialValueNote("Mouza rate went up")).toBe(false);
    expect(isInitialValueNote(null)).toBe(false);
  });

  it("lists the values an asset went through, purchase first", () => {
    expect(valueTrail(checked)).toEqual([1800000, 2250000]);
    expect(valueTrail(asset({ valueHistory: [] }))).toEqual([1800000]);
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
      // The sparkline runs from the price to today's worth.
      expect(valueTrail(subject)).toEqual([50000, 65000]);
    }
  });
});

describe("typeChips", () => {
  const types = [type("Vehicle"), type("Land"), type("Gold")];
  const counts = new Map([
    ["Land", 2],
    ["Vehicle", 1],
    ["Boat", 1],
  ]);

  it("lists the types that hold something in their own order, then names no type has", () => {
    expect(typeChips(types, counts)).toEqual(["Vehicle", "Land", "Boat"]);
  });

  it("keeps the type the page was opened for, even while it is empty", () => {
    expect(typeChips(types, counts, "Gold")).toEqual(["Vehicle", "Land", "Gold", "Boat"]);
    // A name that isn't a type at all gets no chip of its own.
    expect(typeChips(types, counts, "Shares")).toEqual(["Vehicle", "Land", "Boat"]);
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

  it("sorts by gain, value or purchase date", () => {
    const up = asset({ id: "up", name: "Up", purchasePrice: "100.00", currentValue: "150.00", purchaseDate: "2020-01-01T00:00:00.000Z" });
    const down = asset({ id: "down", name: "Down", purchasePrice: "100.00", currentValue: "80.00", purchaseDate: "2022-01-01T00:00:00.000Z" });
    expect(sortAssets([down, up], "gain").map((a) => a.id)).toEqual(["up", "down"]);
    expect(sortAssets([up, down], "loss").map((a) => a.id)).toEqual(["down", "up"]);
    expect(sortAssets([up, down], "newest").map((a) => a.id)).toEqual(["down", "up"]);
    expect(sortAssets([down, up], "valueLow").map((a) => a.id)).toEqual(["down", "up"]);
  });
});
