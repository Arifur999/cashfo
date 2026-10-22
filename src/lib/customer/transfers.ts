import { localName } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";
import type { Transaction, TransactionsSummary } from "./api";

// The subtype of the wallets savings goals are kept in. A goal's Add funds
// is posted as a transfer from a money wallet into one of them -- but it's
// savings, not money moved between wallets. (An older backend, which can't
// leave those out, lists them among the transfers.)
const SAVINGS_SUBTYPE = "savings";

export function isSavingsTransfer(transaction: Pick<Transaction, "entries">): boolean {
  return transaction.entries.some((entry) => entry.account?.accountSubtype === SAVINGS_SUBTYPE);
}

export interface TransferParties {
  fromId: string | null;
  from: string;
  toId: string | null;
  to: string;
  // The side that is a savings wallet (where a goal's Add funds lands).
  fromSavings: boolean;
  toSavings: boolean;
}

// A transfer is exactly two entries: the CREDIT side is the wallet the
// money left, the DEBIT side the wallet it landed in -- the same convention
// createTransferAction posts with. The names are in the reader's language
// ("নগদ" for Cash in Bangla), as the wallet pickers show them.
export function transferParties(transaction: Pick<Transaction, "entries">, locale: Locale = "en"): TransferParties {
  const credit = transaction.entries.find((entry) => entry.entryType === "CREDIT");
  const debit = transaction.entries.find((entry) => entry.entryType === "DEBIT");
  return {
    fromId: credit?.accountId ?? null,
    from: credit?.account ? localName(locale, credit.account) : "—",
    toId: debit?.accountId ?? null,
    to: debit?.account ? localName(locale, debit.account) : "—",
    fromSavings: credit?.account?.accountSubtype === SAVINGS_SUBTYPE,
    toSavings: debit?.account?.accountSubtype === SAVINGS_SUBTYPE,
  };
}

export function transferAmount(transaction: Pick<Transaction, "entries">): number {
  return Number(transaction.entries[0]?.amount ?? 0);
}

export interface TransferTotals {
  // What moved between wallets, counting only transfers that still stand.
  moved: number;
  // How many those are: wallet-to-wallet transfers neither voided nor the
  // reversal that voided one.
  standing: number;
  // The voided ones, which neither figure above counts.
  voided: number;
  // What savings goals moved, kept out of the figures above.
  savings: number;
}

const cents = (value: string | number) => Math.round(Number(value) * 100) || 0;

// The cards' figures from every transfer in the period, when the page has
// read them all (a backend without the summaries). A voided transfer and
// its reversal are a cancellation, not money moved twice, so neither counts
// while the list keeps both.
export function transferTotals(transfers: Pick<Transaction, "entries" | "status" | "reversalOfId">[]): TransferTotals {
  let moved = 0;
  let savings = 0;
  let standing = 0;
  let voided = 0;
  for (const transfer of transfers) {
    const stands = transfer.status === "POSTED" && !transfer.reversalOfId;
    if (isSavingsTransfer(transfer)) {
      if (stands) savings += cents(transferAmount(transfer));
      continue;
    }
    if (transfer.status === "VOIDED") voided += 1;
    if (stands) {
      standing += 1;
      moved += cents(transferAmount(transfer));
    }
  }
  return { moved: moved / 100, standing, voided, savings: savings / 100 };
}

// The same figures from two summaries of the period's transfers: all of
// them, and the ones no savings goal took part in (excludeSavings). What the
// goals moved is the difference. null when the summary doesn't count the
// standing ones (a backend older than that), so the page reads every row.
export function summaryTransferTotals(all: Pick<TransactionsSummary, "totals">, walletOnly: TransactionsSummary): TransferTotals | null {
  if (walletOnly.standing === undefined) return null;
  return {
    moved: cents(walletOnly.totals.TRANSFER) / 100,
    standing: walletOnly.standing,
    voided: walletOnly.voided,
    savings: Math.max(cents(all.totals.TRANSFER) - cents(walletOnly.totals.TRANSFER), 0) / 100,
  };
}

export interface TransferPair {
  fromId: string;
  toId: string;
}

// The Move money drawer's From and To once its wallets load: the last
// choice while those wallets are still offered, otherwise the first ones,
// and never the same wallet on both sides. Empty where there is none.
export function transferPair(walletIds: string[], current: TransferPair): TransferPair {
  const fromId = walletIds.includes(current.fromId) ? current.fromId : (walletIds[0] ?? "");
  const toId = current.toId !== fromId && walletIds.includes(current.toId) ? current.toId : (walletIds.find((id) => id !== fromId) ?? "");
  return { fromId, toId };
}
