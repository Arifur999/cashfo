"use client";

import { useState } from "react";
import { retryPaymentAction } from "@/app/(dashboardLayout)/admin/payments/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import FormDialog from "@/components/shared/dialog/FormDialog";
import { Button } from "@/components/ui/button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatCurrency } from "@/lib/currency";
import { shortPaymentId } from "@/lib/payments";
import { queryKeys } from "@/lib/queryKeys";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IPaymentDetail } from "@/types/payment.types";
import RefundForm from "./RefundForm";

const BUTTON = "h-9.5 rounded-md border-line-strong bg-surface text-body font-semibold text-ink hover:bg-cream";

// Retry only makes sense for a failed payment, refund only for a paid one.
const PaymentDetailActions = ({ payment }: { payment: IPaymentDetail }) => {
  const [dialog, setDialog] = useState<"retry" | "refund" | null>(null);
  const close = () => setDialog(null);
  const retry = useActionMutation({
    action: retryPaymentAction,
    successMessage: "Payment set back to Waiting",
    invalidateKeys: [queryKeys.payments.all],
    refreshRoute: true,
  });

  return (
    <>
      {payment.status === "FAILED" && (
        <Button variant="outline" className={BUTTON} onClick={() => setDialog("retry")}>
          Retry
        </Button>
      )}
      {payment.status === "SUCCESS" && (
        <Button variant="outline" className={BUTTON} onClick={() => setDialog("refund")}>
          Refund
        </Button>
      )}

      <ConfirmDialog
        open={dialog === "retry"}
        onOpenChange={(open) => !open && close()}
        title={`Retry ${shortPaymentId(payment.id)}?`}
        // No payment gateway is connected, so nothing is charged here: the
        // payment only goes back to Waiting.
        description={`Nothing is charged now. The ${formatCurrency(payment.amount, payment.currency)} payment goes back to Waiting, to be collected again through ${humanizeEnum(payment.gateway)}.`}
        confirmLabel="Retry"
        pendingLabel="Saving..."
        isPending={retry.isPending}
        onConfirm={async () => {
          if (await retry.run(payment.id)) close();
        }}
      />

      <FormDialog open={dialog === "refund"} onOpenChange={(open) => !open && close()} title={`Refund ${shortPaymentId(payment.id)}`} size="md">
        <RefundForm payment={payment} onDone={close} />
      </FormDialog>
    </>
  );
};

export default PaymentDetailActions;
