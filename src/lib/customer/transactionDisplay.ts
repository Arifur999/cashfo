import type { Transaction, TransactionType } from "./api";

// What each transaction type is called on screen -- English keys for t().
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
  TRANSFER: "Transfer",
  JOURNAL: "Journal",
  SALE: "Sale",
  PURCHASE: "Purchase",
  PAYMENT: "Payment",
};

// A voided transaction and the reversal that cancels it both stay in the
// ledger (their entries net to zero), but neither is money that moved, so
// lists show them muted and never as new income or spending.
export function isCancelled(transaction: Pick<Transaction, "status" | "reversalOfId">): boolean {
  return transaction.status === "VOIDED" || !!transaction.reversalOfId;
}

// The note a cancelled row carries: "Voided" on the original, "Reversal" on
// the posting that undid it. Null for a standing transaction.
export function cancelledLabel(transaction: Pick<Transaction, "status" | "reversalOfId">): "Voided" | "Reversal" | null {
  if (transaction.reversalOfId) return "Reversal";
  if (transaction.status === "VOIDED") return "Voided";
  return null;
}
