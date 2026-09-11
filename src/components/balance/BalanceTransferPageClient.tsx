"use client";

import { ArrowLeftRight, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TransferModal } from "@/components/quick-entry/TransferModal";
import type { Transaction } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

interface BalanceTransferPageClientProps {
  businessId: string;
  transfers: Transaction[];
  currency: string;
}

function amountFor(transaction: Transaction): number {
  return Number(transaction.entries[0]?.amount ?? 0);
}

export function BalanceTransferPageClient({ businessId, transfers, currency }: BalanceTransferPageClientProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Balance Transfer</h1>
          <p className="mt-1 text-sm text-neutral-500">Move money between your own cash, bank, and mobile money accounts.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" /> Transfer
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {transfers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">No transfers yet.</p>
        ) : (
          <div className="divide-y divide-neutral-50">
            {transfers.map((t) => {
              const isVoided = t.status === "VOIDED";
              return (
                <Link
                  key={t.id}
                  href={`/transactions/${t.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50/60 ${isVoided ? "opacity-50" : ""}`}
                >
                  <ArrowLeftRight className="h-6 w-6 shrink-0 text-neutral-500" />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium text-neutral-800 ${isVoided ? "line-through" : ""}`}>
                      {t.description ?? "Transfer"}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {new Date(t.transactionDate).toLocaleDateString()}
                      {isVoided && <span className="text-brand-danger"> · Voided</span>}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-700">{formatCurrency(amountFor(t), currency)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <TransferModal open={modalOpen} onClose={() => setModalOpen(false)} businessId={businessId} />
    </div>
  );
}
