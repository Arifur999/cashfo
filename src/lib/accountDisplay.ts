import type { Account, LanguagePreference } from "./api";

// Accepts anything with name/nameBn (not just the full Account shape) so
// the same helper works for the lighter GeneralLedgerAccount rows too.
export function accountDisplayName(account: { name: string; nameBn: string | null }, lang: LanguagePreference): string {
  if (lang === "BN" && account.nameBn) return account.nameBn;
  return account.name;
}

export const ACCOUNT_TYPE_LABELS: Record<Account["accountType"], string> = {
  ASSET: "Assets",
  LIABILITY: "Liabilities",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expenses",
};
