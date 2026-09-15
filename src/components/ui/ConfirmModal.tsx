"use client";

import { Loader2 } from "lucide-react";
import { Modal } from "./Modal";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isPending?: boolean;
  danger?: boolean;
}

// Custom-styled stand-in for window.confirm() -- same Modal shell as every
// other dialog in this app, so a destructive action doesn't suddenly drop
// into the browser's own unstyled alert box.
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", isPending, danger = true }: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-neutral-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onConfirm}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 ${
            danger ? "bg-brand-danger hover:bg-brand-danger-hover" : "bg-brand-primary hover:bg-brand-primary-hover"
          }`}
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
