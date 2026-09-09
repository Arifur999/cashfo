"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { t } from "@/lib/i18n/t";

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  tempPassword: string | null;
}

export function ResetPasswordModal({ open, onClose, tempPassword }: ResetPasswordModalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access can fail (permissions/insecure context) -- not critical, the value is still shown on screen
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Temporary Password")}>
      <p className="mb-3 text-sm text-neutral-500">
        {t("Shown once. Relay this to the user yourself — it is not stored anywhere and will not be shown again.")}
      </p>
      <div className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-brand-content px-3.5 py-2.5 font-mono text-sm">
        <span>{tempPassword}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={t("Copy")}
          className="shrink-0 rounded-lg p-1.5 text-neutral-500 hover:bg-white hover:text-neutral-800"
        >
          {copied ? <Check className="h-4 w-4 text-brand-primary" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          {t("Done")}
        </button>
      </div>
    </Modal>
  );
}
