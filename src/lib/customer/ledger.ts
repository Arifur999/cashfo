import type { AccountType, EntryType, TransactionType } from "./api";

// Same rule as the backend's isDebitPositive() -- duplicated here (not
// shared code across the frontend/backend boundary) purely to decide which
// statement column ("In" vs "Out") a DEBIT/CREDIT entry lands in.
export function isDebitPositive(accountType: AccountType): boolean {
  return accountType === "ASSET" || accountType === "EXPENSE";
}

// Whether an entry brought money into the account or took it out.
export function ledgerDirection(entryType: EntryType, accountType: AccountType): "in" | "out" {
  return (entryType === "DEBIT") === isDebitPositive(accountType) ? "in" : "out";
}

// The chip colour for a statement row's type.
export const LEDGER_TYPE_TONE: Record<TransactionType, "income" | "expense" | "info" | "neutral"> = {
  INCOME: "income",
  EXPENSE: "expense",
  TRANSFER: "info",
  JOURNAL: "neutral",
  SALE: "income",
  PURCHASE: "expense",
  PAYMENT: "neutral",
};
