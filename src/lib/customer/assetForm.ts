// The Assets boards' form rules, pure so they are tested on their own. Each
// answers with an English dictionary key and its values; the popups
// translate it (t(key, values)).
import type { Asset } from "./api";

export interface Problem {
  key: string;
  values?: Record<string, string>;
}

export const NAME_MAX = 60;
export const NOTE_MAX = 300;
export const VALUE_NOTE_MAX = 200;
const MONEY_MAX = 999_999_999_999;

// A typed amount: digits (commas allowed) with up to two decimals, more
// than 0. `label` names the field in the message ("Price", "Sale price").
export function parseAmount(raw: string, label: string): { value: number } | { problem: Problem } {
  const text = raw.trim().replace(/[৳\s]/g, "").replace(/,/g, "");
  if (!text) return { problem: { key: "{label} is required.", values: { label } } };
  if (text.startsWith("-")) return { problem: { key: "{label} can’t be negative.", values: { label } } };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { problem: { key: "Enter {label} in numbers only, like 25000.", values: { label: label.toLowerCase() } } };
  const value = Number(text);
  if (!(value > 0)) return { problem: { key: "{label} must be more than 0.", values: { label } } };
  if (value > MONEY_MAX) return { problem: { key: "{label} is too large.", values: { label } } };
  return { value: Math.round(value * 100) / 100 };
}

// A day picked for an entry ("YYYY-MM-DD"): there, not after today, and not
// before `after` when there is one (`afterName` says what that day is).
export function dateProblem(day: string, today: string, after?: { day: string; name: string; shown: string }): Problem | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { key: "Pick a date." };
  if (day > today) return { key: "The date can’t be in the future." };
  if (after && day < after.day) return { key: "The date can’t be before {what} ({date}).", values: { what: after.name, date: after.shown } };
  return null;
}

// An asset's name: there, at most 60 characters, and not the name of
// another active asset (any letter case).
export function nameProblem(name: string, assets: Pick<Asset, "id" | "name" | "status">[], exceptId?: string): Problem | null {
  const trimmed = name.trim();
  if (!trimmed) return { key: "Enter the asset name." };
  if (trimmed.length > NAME_MAX) return { key: "Keep the name under 60 characters." };
  const lower = trimmed.toLowerCase();
  if (assets.some((asset) => asset.id !== exceptId && asset.status === "ACTIVE" && asset.name.toLowerCase() === lower)) return { key: "You already have an active asset with this name." };
  return null;
}

// The last day a value was set ("YYYY-MM-DD"): the newest history row (the
// purchase's own when there was never an update).
export function lastValueDay(asset: Pick<Asset, "valueHistory" | "purchaseDate">): string {
  return asset.valueHistory.reduce((newest, row) => (row.recordedAt.slice(0, 10) > newest ? row.recordedAt.slice(0, 10) : newest), asset.purchaseDate.slice(0, 10));
}

// The first value update after the purchase ("YYYY-MM-DD"), or null: the
// purchase can't move past it.
export function firstUpdateDay(asset: Pick<Asset, "valueHistory" | "purchaseDate">): string | null {
  const days = asset.valueHistory.map((row) => row.recordedAt.slice(0, 10)).sort();
  return days.length > 1 ? days[1] : null;
}
