"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { t } from "@/lib/i18n/t";

const MIN_REASON_LENGTH = 5;

interface RefundModalProps {
  open: boolean;
  onClose: () => void;
  originalAmount: number;
  isSubmitting: boolean;
  onConfirm: (amount: number, reason: string) => void;
}

export function RefundModal({ open, onClose, originalAmount, isSubmitting, onConfirm }: RefundModalProps) {
  const [amount, setAmount] = useState(originalAmount);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(originalAmount);
      setReason("");
    }
  }, [open, originalAmount]);

  const isValid = amount > 0 && amount <= originalAmount && reason.trim().length >= MIN_REASON_LENGTH;

  return (
    <Modal open={open} onClose={onClose} title={t("Refund Payment")}>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">
        {t("Amount")} <span className="text-neutral-400">({t("max")} {originalAmount})</span>
      </label>
      <input
        type="number"
        value={amount}
        max={originalAmount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="mb-4 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
      />
      {amount > originalAmount && (
        <p className="-mt-3 mb-4 text-xs text-brand-danger">{t("Cannot exceed the original payment amount.")}</p>
      )}

      <label htmlFor="refund-reason" className="mb-1.5 block text-sm font-medium text-neutral-700">
        {t("Reason")}
      </label>
      <textarea
        id="refund-reason"
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("Explain why (minimum 5 characters)")}
        className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
      />

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={!isValid || isSubmitting}
          onClick={() => onConfirm(amount, reason.trim())}
          className="flex items-center gap-2 rounded-xl bg-brand-danger px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-danger-hover disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("Confirm Refund")}
        </button>
      </div>
    </Modal>
  );
}
