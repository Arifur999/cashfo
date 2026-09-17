"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { t } from "@/lib/i18n/t";

interface ResetOwnerDataModalProps {
  open: boolean;
  onClose: () => void;
  ownerName: string;
  businessName: string;
  isSubmitting: boolean;
  onConfirm: () => void;
}

export function ResetOwnerDataModal({ open, onClose, ownerName, businessName, isSubmitting, onConfirm }: ResetOwnerDataModalProps) {
  const [typedName, setTypedName] = useState("");
  const isValid = typedName.trim() === businessName;

  function handleClose() {
    setTypedName("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("Reset Owner Data")}>
      <div className="mb-4 flex gap-2 rounded-xl bg-brand-danger/10 p-3 text-sm text-brand-danger">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span>
          {t("This permanently deletes all transactions, accounts, contacts, savings goals, assets, and budget categories for")}{" "}
          <strong>{ownerName}</strong>&apos;s workspace &ldquo;{businessName}&rdquo;, resetting it to a fresh, empty state. {t("This can't be undone.")}{" "}
          {t("Their account login stays intact.")}
        </span>
      </div>

      <label htmlFor="confirm-business-name" className="mb-1.5 block text-sm font-medium text-neutral-700">
        {t("Type the workspace name to confirm:")} <strong>{businessName}</strong>
      </label>
      <input
        id="confirm-business-name"
        type="text"
        value={typedName}
        onChange={(e) => setTypedName(e.target.value)}
        placeholder={businessName}
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
          onClick={onConfirm}
          className="flex items-center gap-2 rounded-xl bg-brand-danger px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-danger-hover disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("Reset Data")}
        </button>
      </div>
    </Modal>
  );
}
