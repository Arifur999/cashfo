import type { Account, LanguagePreference } from "./api";
import { formatCurrency, formatSignedCurrency } from "./currency";

// Accepts anything with name/nameBn (not just the full Account shape) so
// the same helper works for lighter account-row shapes too.
// The language names are shown in: the one on screen (the locale cookie),
// not the account's stored preference -- after switching language the rest
// of the page changed but account names stayed in the old one.
export const displayLanguage = (locale: "en" | "bn"): LanguagePreference => (locale === "bn" ? "BN" : "EN");

export function accountDisplayName(account: { name: string; nameBn?: string | null }, lang: LanguagePreference): string {
  if (lang === "BN" && account.nameBn) return account.nameBn;
  return account.name;
}

// A balance as it is shown: "৳ 2,500", and an overdrawn one with a true
// minus ("− ৳ 1,81,600"), as the signed figures beside it are written,
// rather than a hyphen pressed against the symbol.
export function balanceText(value: number | string, currency: string): string {
  return Number(value) < 0 ? formatSignedCurrency(value, currency) : formatCurrency(value, currency);
}

export const ACCOUNT_TYPE_LABELS: Record<Account["accountType"], string> = {
  ASSET: "Assets",
  LIABILITY: "Liabilities",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expenses",
};
