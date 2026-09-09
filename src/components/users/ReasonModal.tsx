"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { t } from "@/lib/i18n/t";

const MIN_REASON_LENGTH = 5;

interface ReasonModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  warning: string;
  confirmLabel: string;
  isSubmitting: boolean;
  onConfirm: (reason: string) => void;
}

export function ReasonModal({ open, onClose, title, warning, confirmLabel, isSubmitting, onConfirm }: ReasonModalProps) {
  const [reason, setReason] = useState("");
  const isValid = reason.trim().length >= MIN_REASON_LENGTH;

  function handleClose() {
    setReason("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <div className="mb-4 flex gap-2 rounded-xl bg-brand-danger/10 p-3 text-sm text-brand-danger">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span>{warning}</span>
      </div>

      <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-neutral-700">
        {t("Reason")}
      </label>
      <textarea
        id="reason"
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("Explain why (minimum 5 characters)")}
        className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
      />

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={handleClose}
          className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={!isValid || isSubmitting}
          onClick={() => onConfirm(reason.trim())}
          className="flex items-center gap-2 rounded-xl bg-brand-danger px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-danger-hover disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
