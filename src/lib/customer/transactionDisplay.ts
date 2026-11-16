import type { Translate } from "@/lib/i18n/message";
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

// The reason the backend's delete voids with (transactions.service
// DELETED_REASON); also the label of a void that undoes an entry just made.
export const DELETED_REASON = "Deleted from Transactions";

// Why a transaction was voided, in the reader's language when the app wrote
// it (a correction, a delete), else as typed.
export const voidReasonLabel = (reason: string, t: Translate): string => (reason === "Corrected" || reason === DELETED_REASON ? t(reason) : reason);

// The note a cancelled row carries: "Voided" on the original, "Reversal" on
// the posting that undid it. Null for a standing transaction.
export function cancelledLabel(transaction: Pick<Transaction, "status" | "reversalOfId">): "Voided" | "Reversal" | null {
  if (transaction.reversalOfId) return "Reversal";
  if (transaction.status === "VOIDED") return "Voided";
  return null;
}

// The pages that open a transaction with ?from=<their own address> so its
// back link returns to them as they were left (the person, period and
// page in the query), and what the link calls each one (English keys for
// t()). Anything else -- another site, an admin page, a path that only
// looks like one of these -- is ignored and the link goes to Transactions.
const BACK_TARGETS: { path: RegExp; label: string }[] = [
  { path: /^\/balance\/ledger\/?$/, label: "Statement" },
  { path: /^\/balance\/transfer\/?$/, label: "Transfer" },
  { path: /^\/balance\/wallet(\/[^/]+)?\/?$/, label: "My wallets" },
  { path: /^\/balance\/overview\/?$/, label: "Balance" },
  { path: /^\/loan-management\/transactions\/?$/, label: "Loan payments" },
  { path: /^\/loan-management\/ledger\/?$/, label: "Loan statement" },
  { path: /^\/accounts\/[^/]+\/?$/, label: "Account" },
  { path: /^\/contacts\/[^/]+\/?$/, label: "Contact" },
];

const LOCAL_ORIGIN = "http://smartly.local";

export interface TransactionBackLink {
  href: string;
  label: string;
}

// A transaction page's ?from=, checked: only a same-site path to one of the
// pages above, kept with its query. Null for anything else.
export function transactionBackLink(from: unknown): TransactionBackLink | null {
  if (typeof from !== "string" || from.length > 2048 || !from.startsWith("/") || from.startsWith("//") || /[\\\s]/.test(from) || /\p{Cc}/u.test(from)) return null;
  let url: URL;
  try {
    url = new URL(from, LOCAL_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== LOCAL_ORIGIN) return null;
  const target = BACK_TARGETS.find((candidate) => candidate.path.test(url.pathname));
  return target ? { href: `${url.pathname}${url.search}`, label: target.label } : null;
}

// Another transaction's address that keeps the way back (the original a
// reversal undid, the entry a correction replaced).
export function transactionPageHref(id: string, back: TransactionBackLink | null): string {
  return back ? `/transactions/${id}?${new URLSearchParams({ from: back.href })}` : `/transactions/${id}`;
}
