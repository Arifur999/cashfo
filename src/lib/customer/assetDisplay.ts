import type { Asset, AssetCategoryOption, AssetValueHistoryEntry } from "./api";
import { monthsLeft } from "./savingsDisplay";

// What an asset is worth: today's value while owned, the sale price once sold.
// Whether a category is offered for new assets (an older backend sends no
// flag: every category is).
export const isActiveCategory = (category: Pick<AssetCategoryOption, "isActive">): boolean => category.isActive !== false;

// Purchase & Sell: a purchase paid from a wallet, or a sale.
export interface TradeRow {
  key: string;
  kind: "PURCHASE" | "SALE";
  // YYYY-MM-DD
  date: string;
  asset: Asset;
  amount: number;
  accountId: string | null;
}

// Purchase & Sell's list: every purchase paid from a wallet (an asset
// added as already owned moved no money, so it isn't one) and every sale,
// newest first; on one day the sale comes before the purchase.
export function tradeRows(assets: Asset[]): TradeRow[] {
  const rows: TradeRow[] = [];
  for (const asset of assets) {
    if (asset.purchaseAccountId) rows.push({ key: `${asset.id}:buy`, kind: "PURCHASE", date: asset.purchaseDate.slice(0, 10), asset, amount: Number(asset.purchasePrice), accountId: asset.purchaseAccountId });
    if (asset.status === "SOLD" && asset.soldAt) rows.push({ key: `${asset.id}:sell`, kind: "SALE", date: asset.soldAt.slice(0, 10), asset, amount: Number(asset.soldPrice ?? 0), accountId: asset.soldAccountId });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || (a.kind === b.kind ? 0 : a.kind === "SALE" ? -1 : 1));
}

export function assetWorth(asset: Pick<Asset, "status" | "currentValue" | "soldPrice">): number {
  return Number(asset.status === "SOLD" ? (asset.soldPrice ?? 0) : asset.currentValue);
}

export interface Gain {
  amount: number;
  // Against what was paid, as a percentage; 0 when nothing was paid.
  percent: number;
}

const gainOf = (worth: number, paid: number): Gain => ({ amount: worth - paid, percent: paid > 0 ? ((worth - paid) / paid) * 100 : 0 });

export function assetGain(asset: Pick<Asset, "status" | "currentValue" | "soldPrice" | "purchasePrice">): Gain {
  return gainOf(assetWorth(asset), Number(asset.purchasePrice));
}

export interface GainChip {
  tone: "income" | "expense" | "neutral";
  label: string;
}

// "+5.7%" in green, "−3.2%" in red, "0%" in grey; anything within a
// twentieth of a percent reads as no change.
export function gainChip(percent: number): GainChip {
  if (percent > 0.05) return { tone: "income", label: `+${percent.toFixed(1)}%` };
  if (percent < -0.05) return { tone: "expense", label: `−${Math.abs(percent).toFixed(1)}%` };
  return { tone: "neutral", label: "0%" };
}

export interface AssetsSummary {
  owned: Asset[];
  totalValue: number;
  totalPaid: number;
  // On what is still owned.
  gain: Gain;
  // Newest sale first.
  sold: Asset[];
  // What the sales made against what those assets cost.
  soldGain: Gain;
}

export function assetsSummary(assets: Asset[]): AssetsSummary {
  const owned = assets.filter((asset) => asset.status === "ACTIVE");
  const totalValue = owned.reduce((sum, asset) => sum + Number(asset.currentValue), 0);
  const totalPaid = owned.reduce((sum, asset) => sum + Number(asset.purchasePrice), 0);
  const sold = assets.filter((asset) => asset.status === "SOLD").sort((a, b) => (b.soldAt ?? "").localeCompare(a.soldAt ?? ""));
  const soldFor = sold.reduce((sum, asset) => sum + assetWorth(asset), 0);
  const soldCost = sold.reduce((sum, asset) => sum + Number(asset.purchasePrice), 0);
  return { owned, totalValue, totalPaid, gain: gainOf(totalValue, totalPaid), sold, soldGain: gainOf(soldFor, soldCost) };
}

export interface CategoryValue {
  name: string;
  value: number;
  count: number;
  // Share of today's value, 0–100.
  share: number;
}

// Today's value of the owned assets by type, biggest first.
export function valueByCategory(owned: Asset[]): CategoryValue[] {
  const byName = new Map<string, CategoryValue>();
  for (const asset of owned) {
    const entry = byName.get(asset.category) ?? { name: asset.category, value: 0, count: 0, share: 0 };
    entry.value += Number(asset.currentValue);
    entry.count += 1;
    byName.set(asset.category, entry);
  }
  const total = [...byName.values()].reduce((sum, entry) => sum + entry.value, 0);
  return [...byName.values()].map((entry) => ({ ...entry, share: total > 0 ? (entry.value / total) * 100 : 0 })).sort((a, b) => b.value - a.value);
}

// When the value was last updated: the newest history row besides the
// purchase's own (the oldest), or null when it never was.
export function lastValued(asset: Pick<Asset, "valueHistory">): string | null {
  const lines = statementLines(asset);
  return lines.length > 1 ? lines[lines.length - 1].date : null;
}

// How many value updates the asset has had: every history row but the
// purchase's own.
export function updateCount(asset: Pick<Asset, "valueHistory">): number {
  return Math.max(0, asset.valueHistory.length - 1);
}

// Owned, and not valued for this many months (the purchase counts as the
// first valuation).
export function isStale(asset: Pick<Asset, "status" | "valueHistory" | "purchaseDate">, today: string, months = 6): boolean {
  if (asset.status !== "ACTIVE") return false;
  const last = (lastValued(asset) ?? asset.purchaseDate).slice(0, 10);
  return monthsLeft(today, last) >= months;
}

// The notes the backend writes on an asset's first history row; the pages
// say "Bought" in the reader's language instead.
const INITIAL_NOTES = new Set(["Initial purchase value", "Initial value"]);

export const isInitialValueNote = (note: string | null | undefined): boolean => !!note && INITIAL_NOTES.has(note);

// Newest first. Something already owned and valued on the day it was
// bought has two rows with the same date, which the backend returns in
// either order; the purchase's own row counts as the older one.
const newestFirst = (a: AssetValueHistoryEntry, b: AssetValueHistoryEntry): number => b.recordedAt.localeCompare(a.recordedAt) || Number(isInitialValueNote(a.note)) - Number(isInitialValueNote(b.note));

export interface TimelineEntry {
  id: string;
  // ISO from the history, "YYYY-MM-DD" for the value about to be saved.
  date: string;
  value: number;
  note: string | null;
  // "new" is the value about to be saved; "first" the oldest row, the purchase.
  kind: "new" | "past" | "first";
}

// An asset's value history, newest first, with the value about to be saved
// in its place by date, ahead of anything recorded on the same day.
export function valueTimeline(asset: Pick<Asset, "valueHistory">, pending?: { date: string; value: number; note: string | null }): TimelineEntry[] {
  const past = [...asset.valueHistory].sort(newestFirst);
  const entries: TimelineEntry[] = past.map((entry, index) => ({ id: entry.id, date: entry.recordedAt, value: Number(entry.value), note: entry.note, kind: index === past.length - 1 ? "first" : "past" }));
  if (!pending) return entries;
  const at = entries.findIndex((entry) => entry.date.slice(0, 10) <= pending.date);
  entries.splice(at === -1 ? entries.length : at, 0, { id: "new", date: pending.date, value: pending.value, note: pending.note, kind: "new" });
  return entries;
}

// One line of an asset's value statement, oldest first: the first is
// where it started (bought or listed), each later one a value update with
// what it was before and how far it moved.
export interface StatementLine {
  id: string;
  date: string;
  value: number;
  note: string | null;
  previous: number | null;
  change: number | null;
  percent: number | null;
}

export function statementLines(asset: Pick<Asset, "valueHistory">): StatementLine[] {
  const oldestFirst = valueTimeline(asset).reverse();
  return oldestFirst.map((entry, index) => {
    const previous = index === 0 ? null : oldestFirst[index - 1].value;
    const change = previous === null ? null : entry.value - previous;
    return { id: entry.id, date: entry.date, value: entry.value, note: entry.note, previous, change, percent: previous ? ((change ?? 0) / previous) * 100 : null };
  });
}

// A point on the Dashboard's value chart: what the assets were worth on a
// day against what was paid for them, and the assets added and sold since
// the point before (by name).
export interface ValuePoint {
  // YYYY-MM-DD
  date: string;
  value: number;
  paid: number;
  added: string[];
  sold: string[];
  today: boolean;
}

// The most year-end points the chart draws before it skips years (today
// is always one more).
const MAX_YEARS = 9;

// What an asset was worth at the end of a day: its last value recorded by
// then, or null before it was bought.
export function valueOn(asset: Pick<Asset, "valueHistory" | "purchaseDate" | "purchasePrice">, day: string): number | null {
  if (asset.purchaseDate.slice(0, 10) > day) return null;
  const known = valueTimeline(asset).find((entry) => entry.date.slice(0, 10) <= day);
  return known ? known.value : Number(asset.purchasePrice);
}

// The assets together, sold ones until the day they were sold: their value
// at the end of each year since the first was bought (every few years when
// there are many), and today. It steps up when an asset is added, down when
// one is sold, and moves with every value update.
export function portfolioSeries(assets: Asset[], today: string): ValuePoint[] {
  if (assets.length === 0) return [];
  const bought = (asset: Asset) => asset.purchaseDate.slice(0, 10);
  const soldOn = (asset: Asset) => (asset.status === "SOLD" && asset.soldAt ? asset.soldAt.slice(0, 10) : null);
  const first = assets.map(bought).reduce((min, day) => (day < min ? day : min));
  const firstYear = Number(first.slice(0, 4));
  const thisYear = Number(today.slice(0, 4));
  let years = Array.from({ length: Math.max(0, thisYear - firstYear) }, (_, i) => firstYear + i);
  const step = Math.max(1, Math.ceil(years.length / MAX_YEARS));
  years = years.filter((_, i) => (years.length - 1 - i) % step === 0);
  // All bought this year: the first purchase, then today.
  const days = [...(years.length ? years.map((year) => `${year}-12-31`) : first < today ? [first] : []), today];
  return days.map((day, index) => {
    let value = 0;
    let paid = 0;
    for (const asset of assets) {
      const sale = soldOn(asset);
      if (sale !== null && sale <= day) continue;
      const worth = valueOn(asset, day);
      if (worth === null) continue;
      value += worth;
      paid += Number(asset.purchasePrice);
    }
    const from = index === 0 ? "" : days[index - 1];
    const added = assets.filter((asset) => bought(asset) > from && bought(asset) <= day).map((asset) => asset.name);
    const sold = assets.filter((asset) => {
      const sale = soldOn(asset);
      return sale !== null && sale > from && sale <= day;
    });
    return { date: day, value, paid, added, sold: sold.map((asset) => asset.name), today: index === days.length - 1 };
  });
}

// One asset: every value it was recorded at, against its starting price,
// and the sale last once it was sold.
export function assetSeries(asset: Pick<Asset, "valueHistory" | "status" | "soldAt" | "soldPrice" | "name">): ValuePoint[] {
  const lines = statementLines(asset);
  const start = lines[0]?.value ?? 0;
  const points: ValuePoint[] = lines.map((line) => ({ date: line.date.slice(0, 10), value: line.value, paid: start, added: [], sold: [], today: false }));
  if (asset.status === "SOLD" && asset.soldAt) points.push({ date: asset.soldAt.slice(0, 10), value: Number(asset.soldPrice ?? 0), paid: start, added: [], sold: [asset.name], today: false });
  if (points.length) points[points.length - 1].today = asset.status !== "SOLD";
  return points;
}

// The latest value updates and sales, newest first: what each moved from
// and to. A purchase is where an asset starts, so it isn't one.
export interface ValueChange {
  key: string;
  asset: Asset;
  // YYYY-MM-DD
  date: string;
  kind: "update" | "sale";
  from: number;
  to: number;
  note: string | null;
}

export function recentValueChanges(assets: Asset[], limit = 5): ValueChange[] {
  const changes: ValueChange[] = [];
  for (const asset of assets) {
    const lines = statementLines(asset);
    lines.slice(1).forEach((line, index) => changes.push({ key: `${asset.id}:${line.id}`, asset, date: line.date.slice(0, 10), kind: "update", from: lines[index].value, to: line.value, note: line.note }));
    if (asset.status === "SOLD" && asset.soldAt) {
      const last = lines[lines.length - 1]?.value ?? Number(asset.purchasePrice);
      changes.push({ key: `${asset.id}:sale`, asset, date: asset.soldAt.slice(0, 10), kind: "sale", from: last, to: Number(asset.soldPrice ?? 0), note: asset.soldNote || null });
    }
  }
  // On one day the sale comes after that day's update.
  return changes.sort((a, b) => b.date.localeCompare(a.date) || (a.kind === b.kind ? 0 : a.kind === "sale" ? -1 : 1)).slice(0, limit);
}

// The owned assets' biggest rise and biggest drop at their last value
// update, by percent; null where none moved that way.
export function lastUpdateMovers(owned: Asset[]): { rise: ValueChange | null; drop: ValueChange | null } {
  let rise: ValueChange | null = null;
  let drop: ValueChange | null = null;
  const pct = (change: ValueChange) => (change.from ? (change.to - change.from) / change.from : 0);
  for (const asset of owned) {
    const lines = statementLines(asset);
    if (lines.length < 2) continue;
    const before = lines[lines.length - 2];
    const last = lines[lines.length - 1];
    const change: ValueChange = { key: `${asset.id}:${last.id}`, asset, date: last.date.slice(0, 10), kind: "update", from: before.value, to: last.value, note: last.note };
    if (change.to > change.from && (!rise || pct(change) > pct(rise))) rise = change;
    if (change.to < change.from && (!drop || pct(change) < pct(drop))) drop = change;
  }
  return { rise, drop };
}

// The Dashboard table's orders.
export type AssetSort = "gain" | "loss" | "valueHigh" | "valueLow" | "newest" | "oldest";

export function sortAssets(assets: Asset[], by: AssetSort): Asset[] {
  const percent = (asset: Asset) => assetGain(asset).percent;
  const worth = (asset: Asset) => assetWorth(asset);
  const compare: Record<AssetSort, (a: Asset, b: Asset) => number> = {
    gain: (a, b) => percent(b) - percent(a),
    loss: (a, b) => percent(a) - percent(b),
    valueHigh: (a, b) => worth(b) - worth(a),
    valueLow: (a, b) => worth(a) - worth(b),
    newest: (a, b) => b.purchaseDate.localeCompare(a.purchaseDate),
    oldest: (a, b) => a.purchaseDate.localeCompare(b.purchaseDate),
  };
  return [...assets].sort((a, b) => compare[by](a, b) || a.name.localeCompare(b.name));
}
