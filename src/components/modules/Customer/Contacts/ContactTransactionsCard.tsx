"use client";

import Link from "next/link";
import type { Transaction } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { cancelledLabel, TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Every posting naming this contact, newest first -- the invoices and
// payments the balance above is made of, plus anything else linked to them.
// Each row opens the transaction. Voided ones and their reversals are muted.
export function ContactTransactionsCard({ transactions, total, currency }: { transactions: Transaction[]; total: number; currency: string }) {
  const { t } = useLocale();
  // Both entries of a posting carry the same amount; the first one says it.
  const amountOf = (transaction: Transaction) => Number(transaction.entries[0]?.amount ?? 0);

  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-900">{t("Transactions")}</h2>
        {total > transactions.length && (
          <span className="text-xs text-neutral-400">
            {t("Latest")} {transactions.length} {t("of")} {total}
          </span>
        )}
      </div>
      {transactions.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-400">{t("No transactions yet.")}</p>
      ) : (
        <ul className="divide-y divide-neutral-50">
          {transactions.map((transaction) => {
            const note = cancelledLabel(transaction);
            return (
              <li key={transaction.id} className={note ? "opacity-60" : ""}>
                <Link href={`/transactions/${transaction.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-neutral-50/60">
                  <span className="w-24 shrink-0 text-neutral-500">{formatDate(transaction.transactionDate)}</span>
                  <span className="w-24 shrink-0 text-neutral-600">{t(TRANSACTION_TYPE_LABELS[transaction.transactionType])}</span>
                  <span className="min-w-0 flex-1 truncate text-neutral-700">
                    {transaction.description ?? "—"}
                    {note && <span className="text-brand-danger"> · {t(note)}</span>}
                  </span>
                  <span className={`shrink-0 font-semibold tabular-nums ${note ? "text-neutral-400" : "text-neutral-900"}`}>
                    {formatCurrency(amountOf(transaction), currency)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
