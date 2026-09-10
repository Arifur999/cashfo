import type { Account, LanguagePreference } from "./api";

export function accountDisplayName(account: Account, lang: LanguagePreference): string {
  if (lang === "BN" && account.nameBn) return account.nameBn;
  return account.name;
}

export function formatBalance(value: string): string {
  const n = Number(value);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const ACCOUNT_TYPE_LABELS: Record<Account["accountType"], string> = {
  ASSET: "Assets",
  LIABILITY: "Liabilities",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expenses",
};
