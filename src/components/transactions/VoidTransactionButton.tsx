"use client";

import { Loader2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { voidTransactionAction } from "@/lib/transactionActions";

interface VoidTransactionButtonProps {
  businessId: string;
  transactionId: string;
}

export function VoidTransactionButton({ businessId, transactionId }: VoidTransactionButtonProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");

  function handleVoid() {
    if (reason.trim().length < 5) {
      toast.error(t("Reason must be at least 5 characters"));
      return;
    }
    startTransition(async () => {
      const result = await voidTransactionAction(businessId, transactionId, reason.trim());
      if (result.success) {
        toast.success(t("Transaction voided"));
        setShowReason(false);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to void transaction"));
      }
    });
  }

  if (!showReason) {
    return (
      <button
        type="button"
        onClick={() => setShowReason(true)}
        className="flex items-center gap-2 rounded-xl border border-brand-danger/30 px-4 py-2 text-sm font-medium text-brand-danger hover:bg-red-50"
      >
        <Undo2 className="h-4 w-4" /> {t("Void")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("Reason for voiding (min 5 chars)")}
        className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-danger"
      />
      <button
        type="button"
        disabled={isPending}
        onClick={handleVoid}
        className="flex items-center gap-2 rounded-xl bg-brand-danger px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-danger-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("Confirm Void")}
      </button>
      <button type="button" onClick={() => setShowReason(false)} className="rounded-xl px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100">
        {t("Cancel")}
      </button>
    </div>
  );
}
