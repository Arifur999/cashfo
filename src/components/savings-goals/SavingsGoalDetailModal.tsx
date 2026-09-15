"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { SavingsGoalDetail } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { getSavingsGoalDetailAction } from "@/lib/savingsGoalActions";

interface SavingsGoalDetailModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  goalId: string | null;
  currency: string;
}

const ENTRY_LABEL: Record<string, string> = {
  CONTRIBUTION: "Contribution",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
};

export function SavingsGoalDetailModal({ open, onClose, businessId, goalId, currency }: SavingsGoalDetailModalProps) {
  const [detail, setDetail] = useState<SavingsGoalDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Render-time state-adjustment reset (same convention as every other
  // modal in this app) rather than an effect that calls setState
  // synchronously on every open/goalId change -- the effect below only ever
  // sets state from its async .then() callback.
  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open && goalId ? goalId : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setDetail(null);
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open || !goalId) return;
    getSavingsGoalDetailAction(businessId, goalId).then((data) => {
      setDetail(data);
      setLoading(false);
    });
  }, [open, goalId, businessId]);

  return (
    <Modal open={open} onClose={onClose} title={detail?.name ?? "Goal Details"}>
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : !detail ? (
        <p className="py-6 text-center text-sm text-neutral-400">Couldn&apos;t load this goal.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-neutral-50 p-3">
              <p className="text-xs text-neutral-400">Saved</p>
              <p className="font-semibold tabular-nums text-neutral-900">{formatCurrency(detail.currentAmount, currency)}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-3">
              <p className="text-xs text-neutral-400">Target</p>
              <p className="font-semibold tabular-nums text-neutral-900">{formatCurrency(detail.targetAmount, currency)}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-3">
              <p className="text-xs text-neutral-400">Progress</p>
              <p className="font-semibold text-neutral-900">{detail.progressPercent}%</p>
            </div>
          </div>

          {detail.description && <p className="text-sm text-neutral-600">{detail.description}</p>}

          <div>
            <p className="mb-2 text-sm font-semibold text-neutral-900">History</p>
            {detail.entries.length === 0 ? (
              <p className="text-sm text-neutral-400">No contributions or transfers yet.</p>
            ) : (
              <div className="max-h-64 divide-y divide-neutral-50 overflow-y-auto rounded-xl border border-neutral-100">
                {detail.entries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-neutral-800">{ENTRY_LABEL[entry.type] ?? entry.type}</p>
                      <p className="text-xs text-neutral-400">
                        {new Date(entry.date).toLocaleDateString()}
                        {entry.moneyAccountName && ` · from ${entry.moneyAccountName}`}
                        {entry.savingsAccountName && ` → ${entry.savingsAccountName}`}
                        {entry.relatedGoalName && ` · ${entry.type === "TRANSFER_OUT" ? "to" : "from"} ${entry.relatedGoalName}`}
                      </p>
                    </div>
                    <span className={`font-semibold tabular-nums ${entry.type === "TRANSFER_OUT" ? "text-brand-danger" : "text-brand-primary"}`}>
                      {entry.type === "TRANSFER_OUT" ? "-" : "+"}
                      {formatCurrency(entry.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
