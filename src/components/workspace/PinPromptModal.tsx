"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { verifyBusinessPinAction } from "@/lib/businessActions";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface PinPromptModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  onVerified: () => void;
}

export function PinPromptModal({ open, onClose, businessId, businessName, onVerified }: PinPromptModalProps) {
  const { t } = useLocale();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset the form the instant the modal transitions closed -> open (React's
  // documented render-time pattern for "reset state when a prop changes",
  // rather than a useEffect that would cause an extra render pass) -- same
  // pattern as CreateWorkspaceModal.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPin("");
      setError(null);
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await verifyBusinessPinAction(businessId, pin);
      if (!result.success) {
        toast.error(result.message ?? t("Failed to verify PIN"));
        return;
      }
      if (result.data?.valid === true) {
        onVerified();
        onClose();
      } else {
        setError(t("Incorrect PIN, try again."));
        setPin("");
      }
    });
  }

  const isValid = pin.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title={t("Enter PIN")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Enter PIN:")} {businessName}</label>
          <input
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/[^0-9]/g, ""));
              setError(null);
            }}
            maxLength={6}
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus
            placeholder="••••"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm tracking-widest outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
          {error && <p className="mt-1.5 text-sm text-brand-danger">{error}</p>}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("Unlock")}
        </button>
      </div>
    </Modal>
  );
}
