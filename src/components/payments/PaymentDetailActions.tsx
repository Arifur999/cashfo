"use client";

import { Loader2, RefreshCw, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { refundPaymentAction, retryPaymentAction } from "@/app/admin/(dashboard)/payments/_actions";
import type { PaymentDetail } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { RefundModal } from "./RefundModal";

interface PaymentDetailActionsProps {
  payment: PaymentDetail;
  canManage: boolean;
}

export function PaymentDetailActions({ payment, canManage }: PaymentDetailActionsProps) {
  const router = useRouter();
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!canManage) return null;

  function handleRefund(amount: number, reason: string) {
    startTransition(async () => {
      const result = await refundPaymentAction(payment.id, amount, reason);
      if (result.success) {
        toast.success(t("Payment refunded"));
        setIsRefundOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to refund payment"));
      }
    });
  }

  function handleRetry() {
    startTransition(async () => {
      const result = await retryPaymentAction(payment.id);
      if (result.success) {
        toast.success(t("Payment marked for retry"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to retry payment"));
      }
    });
  }

  return (
    <div className="flex gap-2">
      {payment.status === "FAILED" && (
        <button
          type="button"
          disabled={isPending}
          onClick={handleRetry}
          className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("Retry")}
        </button>
      )}
      {payment.status === "SUCCESS" && (
        <button
          type="button"
          onClick={() => setIsRefundOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-danger px-4 py-2 text-sm font-medium text-white hover:bg-brand-danger-hover"
        >
          <Undo2 className="h-4 w-4" /> {t("Refund")}
        </button>
      )}

      <RefundModal
        open={isRefundOpen}
        onClose={() => setIsRefundOpen(false)}
        originalAmount={Number(payment.amount)}
        isSubmitting={isPending}
        onConfirm={handleRefund}
      />
    </div>
  );
}
