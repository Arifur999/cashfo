"use client";

import { ArrowDownCircle, ArrowUpCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { Transaction, TransactionType } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

interface LoanTransactionsPageClientProps {
  transactions: Transaction[];
  currency: string;
}

function amountFor(transaction: Transaction): number {
  return Number(transaction.entries[0]?.amount ?? 0);
}

// SALE = a loan given out (Pawna created); PURCHASE = a loan taken (Dena
// created); PAYMENT = a repayment in either direction -- same transaction
// types Dena-Pawna uses, just filtered to category: LOAN contacts here.
function typeVisual(type: TransactionType) {
  switch (type) {
    case "SALE":
      return { Icon: ArrowUpCircle, color: "text-brand-primary", label: "Loan Given" };
    case "PURCHASE":
      return { Icon: ArrowDownCircle, color: "text-brand-danger", label: "Loan Taken" };
    case "PAYMENT":
      return { Icon: RotateCcw, color: "text-neutral-500", label: "Payment" };
    default:
      return { Icon: RotateCcw, color: "text-neutral-400", label: type };
  }
}

export function LoanTransactionsPageClient({ transactions, currency }: LoanTransactionsPageClientProps) {
  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">Loan Transactions</h1>
      <p className="mt-1 text-sm text-neutral-500">Every loan given, taken, or repaid.</p>

      <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {transactions.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">No loan transactions yet.</p>
        ) : (
          <div className="divide-y divide-neutral-50">
            {transactions.map((t) => {
              const { Icon, color, label } = typeVisual(t.transactionType);
              const isVoided = t.status === "VOIDED";
              return (
                <Link
                  key={t.id}
                  href={`/transactions/${t.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50/60 ${isVoided ? "opacity-50" : ""}`}
                >
                  <Icon className={`h-6 w-6 shrink-0 ${color}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium text-neutral-800 ${isVoided ? "line-through" : ""}`}>{t.description ?? label}</p>
                    <p className="text-xs text-neutral-400">
                      {label} · {new Date(t.transactionDate).toLocaleDateString()}
                      {isVoided && <span className="text-brand-danger"> · Voided</span>}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-800">{formatCurrency(amountFor(t), currency)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
