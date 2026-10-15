import type { Transaction } from "./api";

export interface TransferParties {
  fromId: string | null;
  from: string;
  toId: string | null;
  to: string;
}

// A transfer is exactly two entries: the CREDIT side is the wallet the
// money left, the DEBIT side the wallet it landed in -- the same convention
// createTransferAction posts with.
export function transferParties(transaction: Pick<Transaction, "entries">): TransferParties {
  const credit = transaction.entries.find((entry) => entry.entryType === "CREDIT");
  const debit = transaction.entries.find((entry) => entry.entryType === "DEBIT");
  return { fromId: credit?.accountId ?? null, from: credit?.account?.name ?? "—", toId: debit?.accountId ?? null, to: debit?.account?.name ?? "—" };
}

export function transferAmount(transaction: Pick<Transaction, "entries">): number {
  return Number(transaction.entries[0]?.amount ?? 0);
}

export interface TransferTotals {
  // What moved, counting only transfers that still stand.
  moved: number;
  count: number;
  // Voided transfers in the list; their reversals are not counted either.
  voided: number;
}

// A voided transfer and its reversal are a cancellation, not money the
// customer moved twice, so the totals skip both while the list keeps them.
export function transferTotals(transfers: Pick<Transaction, "entries" | "status" | "reversalOfId">[]): TransferTotals {
  return transfers.reduce<TransferTotals>(
    (totals, transfer) => {
      if (transfer.status === "VOIDED") return { ...totals, voided: totals.voided + 1 };
      if (transfer.reversalOfId) return totals;
      return { ...totals, moved: totals.moved + transferAmount(transfer), count: totals.count + 1 };
    },
    { moved: 0, count: 0, voided: 0 },
  );
}
