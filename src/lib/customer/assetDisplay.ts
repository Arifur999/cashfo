import type { LucideIcon } from "lucide-react";
import type { Asset, AssetCategoryOption, AssetValueHistoryEntry } from "./api";
import { budgetCategoryIcon } from "./budgetCategoryVisuals";
import { categoryTone, NEUTRAL_CATEGORY_TONE, type CategoryTone } from "./categoryTone";
import { monthsLeft } from "./savingsDisplay";

export interface CategoryVisual {
  icon: LucideIcon;
  tone: CategoryTone;
  // The type's colour as a CSS value, for a bar slice or a dot. A token, so
  // it follows dark mode like the tile does.
  color: string;
}

// The tile's ink as a colour: "text-cat-3" draws var(--cat-3). The neutral
// tile (a type that is gone) draws in the charts' "other" grey.
const toneColor = (tone: CategoryTone): string => {
  const token = /^text-(cat-\d+|warning|expense)$/.exec(tone.fg)?.[1];
  return token ? `var(--${token})` : "var(--chart-other)";
};

// How an asset's type is drawn: the option's icon and colour by name, or a
// neutral package tile when the option is gone.
export function categoryVisual(categories: AssetCategoryOption[], name: string): CategoryVisual {
  const match = categories.find((category) => category.name === name);
  const tone = match ? categoryTone(match.color) : NEUTRAL_CATEGORY_TONE;
  return { icon: budgetCategoryIcon(match?.icon || "package"), tone, color: toneColor(tone) };
}

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

// The owned assets that moved most against what was paid, either way. One
// that hasn't moved (its chip would read "0%") isn't a change at all.
export function biggestChanges(owned: Asset[], limit = 5): Asset[] {
  return owned
    .filter((asset) => Number(asset.purchasePrice) > 0 && gainChip(assetGain(asset).percent).tone !== "neutral")
    .sort((a, b) => Math.abs(assetGain(b).percent) - Math.abs(assetGain(a).percent))
    .slice(0, limit);
}

// When the value was last checked: the newest history entry after the
// purchase itself, or null when it never was.
export function lastValued(asset: Pick<Asset, "valueHistory" | "purchaseDate">): string | null {
  const later = asset.valueHistory.map((entry) => entry.recordedAt).filter((recordedAt) => recordedAt.slice(0, 10) !== asset.purchaseDate.slice(0, 10));
  return later.length === 0 ? null : later.reduce((latest, recordedAt) => (recordedAt > latest ? recordedAt : latest));
}

export function updateCount(asset: Pick<Asset, "valueHistory" | "purchaseDate">): number {
  return asset.valueHistory.filter((entry) => entry.recordedAt.slice(0, 10) !== asset.purchaseDate.slice(0, 10)).length;
}

// The first day a new value may carry ("YYYY-MM-DD"): the purchase, since
// nothing is worth something before it was bought. An earlier day than the
// newest value is fine: the backend files it in the history and keeps the
// newest as the value today.
export function newValueFloor(asset: Pick<Asset, "purchaseDate">): string {
  return asset.purchaseDate.slice(0, 10);
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

// The latest day an already-owned asset's purchase date may move to
// ("YYYY-MM-DD"): today, or the first value recorded after the purchase
// when that is earlier, since nothing is valued before it was bought. The
// purchase's own row moves with the date, so it doesn't count.
export function latestPurchaseDay(asset: Pick<Asset, "valueHistory">, today: string): string {
  const later = [...asset.valueHistory].sort(newestFirst).slice(0, -1);
  return later.reduce((earliest, entry) => (entry.recordedAt.slice(0, 10) < earliest ? entry.recordedAt.slice(0, 10) : earliest), today);
}

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

// The type chips over My assets: every type that holds something, in the
// types' own order, then names no type carries any more. The type the page
// was opened for (an Asset types card) stays even while it holds nothing.
export function typeChips(categories: Pick<AssetCategoryOption, "name">[], counts: ReadonlyMap<string, number>, selected = ""): string[] {
  const known = categories.map((option) => option.name);
  const orphans = [...counts.keys()].filter((name) => !known.includes(name));
  return [...known, ...orphans].filter((name) => counts.has(name) || (name === selected && known.includes(name)));
}

export interface Sparkline {
  line: string;
  area: string;
  lastX: number;
  lastY: number;
}

// The points of a small line chart through the given values, oldest first,
// for a width × height SVG with `pad` kept clear on each side.
export function sparkline(values: number[], width = 130, height = 40, pad = 4): Sparkline {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (values.length - 1);
    const y = max === min ? height / 2 : height - pad - ((value - min) / span) * (height - pad * 2);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as const;
  });
  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const last = points[points.length - 1];
  return { line, area: `${line} ${last[0]},${height} ${points[0][0]},${height}`, lastX: last[0], lastY: last[1] };
}

// The values an owned asset went through, purchase first.
export function valueTrail(asset: Pick<Asset, "valueHistory" | "purchasePrice">): number[] {
  const history = [...asset.valueHistory].sort((a, b) => newestFirst(b, a)).map((entry) => Number(entry.value));
  return history.length > 0 ? history : [Number(asset.purchasePrice)];
}
