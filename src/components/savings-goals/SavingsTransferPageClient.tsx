"use client";

import { ArrowRight, Plus } from "lucide-react";
import { useState } from "react";
import type { SavingsGoal, SavingsTransferRow } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SavingsTransferModal } from "./SavingsTransferModal";

interface SavingsTransferPageClientProps {
  businessId: string;
  goals: SavingsGoal[];
  transfers: SavingsTransferRow[];
  currency: string;
  canManage: boolean;
}

export function SavingsTransferPageClient({ businessId, goals, transfers, currency, canManage }: SavingsTransferPageClientProps) {
  const { t } = useLocale();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("Savings Transfer")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("Move saved money between goals.")}</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={goals.length < 2}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {t("New Transfer")}
          </button>
        )}
      </div>

      {goals.length < 2 && (
        <p className="mb-4 text-sm text-neutral-400">{t("You need at least two savings goals to transfer between them.")}</p>
      )}

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-900">{t("Transfer History")}</h2>
        </div>

        {transfers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">{t("No transfers yet.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">{t("Date")}</th>
                  <th className="px-4 py-3 font-medium">{t("From")}</th>
                  <th className="px-4 py-3 font-medium"></th>
                  <th className="px-4 py-3 font-medium">{t("To")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("Amount")}</th>
                  <th className="px-4 py-3 font-medium">{t("Notes")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {transfers.map((transfer, index) => (
                  <tr key={transfer.id}>
                    <td className="px-4 py-3 text-neutral-400">{index + 1}</td>
                    <td className="px-4 py-3 text-neutral-600">{new Date(transfer.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium text-brand-danger">{transfer.fromGoalName}</td>
                    <td className="px-4 py-3 text-neutral-300">
                      <ArrowRight className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-primary">{transfer.toGoalName}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-neutral-900">{formatCurrency(transfer.amount, currency)}</td>
                    <td className="px-4 py-3 text-neutral-400">{transfer.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SavingsTransferModal open={modalOpen} onClose={() => setModalOpen(false)} businessId={businessId} goals={goals} />
    </div>
  );
}
