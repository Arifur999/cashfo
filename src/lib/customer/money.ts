import { formatGrouped } from "./currency";

// The API takes amounts with at most two decimals (0.01 up to
// 999,999,999,999.99); a third decimal was only refused after submitting,
// with the validator's own wording. Money inputs pass every keystroke through
// this, so a third decimal can't be typed in the first place.
export function limitMoneyDecimals(value: string): string {
  const match = /^(-?\d*)(\.\d{0,2})?\d*$/.exec(value);
  if (!match || !value.includes(".")) return value;
  return `${match[1]}${match[2] ?? ""}`;
}

const BANGLA_ZERO = "০".charCodeAt(0);

// Bangla digits (২৫০০০) typed into an amount become the English ones the
// API reads; everything else is left as typed.
export function toEnglishDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - BANGLA_ZERO));
}

// What every money input runs on each keystroke: Bangla digits converted,
// anything that isn't a digit or the point dropped, two decimals at most.
export function normalizeMoneyInput(value: string): string {
  return limitMoneyDecimals(toEnglishDigits(value).replace(/[^\d.]/g, ""));
}

// An amount as its input shows it while typing: the whole part grouped the
// currency's way ("16,50,000" for taka), the point and decimals as typed.
// Takes what normalizeMoneyInput leaves: digits and at most one point.
export function groupAmountInput(raw: string, currency: string): string {
  if (!raw) return raw;
  const [whole, decimals] = raw.split(".");
  const grouped = whole ? formatGrouped(whole, currency) : "";
  return decimals === undefined ? grouped : `${grouped}.${decimals}`;
}
