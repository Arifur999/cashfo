import type { LucideIcon } from "lucide-react";
import type { Asset, AssetCategoryOption } from "./api";
import { budgetCategoryHex, budgetCategoryIcon } from "./budgetCategoryVisuals";
import { categoryTone, NEUTRAL_CATEGORY_TONE, type CategoryTone } from "./categoryTone";
import { monthsLeft } from "./savingsDisplay";

export interface CategoryVisual {
  icon: LucideIcon;
  tone: CategoryTone;
  // The category's own colour, for a bar slice or a solid tile.
  hex: string;
}

// How an asset's category is drawn: the option's icon and colour by name,
// or a neutral tile when the option is gone.
export function categoryVisual(categories: AssetCategoryOption[], name: string): CategoryVisual {
  const match = categories.find((category) => category.name === name);
  return { icon: budgetCategoryIcon(match?.icon ?? ""), tone: match ? categoryTone(match.color) : NEUTRAL_CATEGORY_TONE, hex: match ? budgetCategoryHex(match.color) : "#a3a3a3" };
}

// What an asset is worth: today's value while owned, the sale price once sold.
export function assetWorth(asset: Pick<Asset, "status" | "currentValue" | "soldPrice">): number {
  return Number(asset.status === "SOLD" ? (asset.soldPrice ?? 0) : asset.currentValue);
}

export interface Gain {
  amount: number;
  // Against what was paid, as a percentage; 0 when nothing was paid.
  percent: number;
}

export function assetGain(asset: Pick<Asset, "status" | "currentValue" | "soldPrice" | "purchasePrice">): Gain {
  const paid = Number(asset.purchasePrice);
  const amount = assetWorth(asset) - paid;
  return { amount, percent: paid > 0 ? (amount / paid) * 100 : 0 };
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
  gain: Gain;
  // Newest sale first.
  sold: Asset[];
}

export function assetsSummary(assets: Asset[]): AssetsSummary {
  const owned = assets.filter((asset) => asset.status === "ACTIVE");
  const totalValue = owned.reduce((sum, asset) => sum + Number(asset.currentValue), 0);
  const totalPaid = owned.reduce((sum, asset) => sum + Number(asset.purchasePrice), 0);
  const sold = assets.filter((asset) => asset.status === "SOLD").sort((a, b) => (b.soldAt ?? "").localeCompare(a.soldAt ?? ""));
  return { owned, totalValue, totalPaid, gain: { amount: totalValue - totalPaid, percent: totalPaid > 0 ? ((totalValue - totalPaid) / totalPaid) * 100 : 0 }, sold };
}

export interface CategoryValue {
  name: string;
  value: number;
  count: number;
  // Share of today's value, 0–100.
  share: number;
}

// Today's value of the owned assets by category, biggest first.
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

// The owned assets that moved most against what was paid, either way.
export function biggestChanges(owned: Asset[], limit = 5): Asset[] {
  return owned
    .filter((asset) => Number(asset.purchasePrice) > 0)
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

// Owned, and not valued for this many months (the purchase counts as the
// first valuation).
export function isStale(asset: Pick<Asset, "status" | "valueHistory" | "purchaseDate">, today: string, months = 6): boolean {
  if (asset.status !== "ACTIVE") return false;
  const last = (lastValued(asset) ?? asset.purchaseDate).slice(0, 10);
  return monthsLeft(today, last) >= months;
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
  const history = [...asset.valueHistory].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)).map((entry) => Number(entry.value));
  return history.length > 0 ? history : [Number(asset.purchasePrice)];
}
