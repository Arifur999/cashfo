"use client";

import { RefreshCw, Undo2 } from "lucide-react";
import { useState } from "react";
import { retryPaymentAction } from "@/app/(dashboardLayout)/admin/payments/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import FormDialog from "@/components/shared/dialog/FormDialog";
import { Button } from "@/components/ui/button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatCurrency } from "@/lib/currency";
import { queryKeys } from "@/lib/queryKeys";
import type { IPaymentDetail } from "@/types/payment.types";
import RefundForm from "./RefundForm";

// Retry only makes sense for a failed payment, refund only for a successful one.
const PaymentDetailActions = ({ payment }: { payment: IPaymentDetail }) => {
  const [dialog, setDialog] = useState<"retry" | "refund" | null>(null);
  const close = () => setDialog(null);
  const retry = useActionMutation({
    action: retryPaymentAction,
    successMessage: "Payment set back to Pending",
    invalidateKeys: [queryKeys.payments.all],
  });

  return (
    <div className="flex flex-wrap gap-2">
      {payment.status === "FAILED" && (
        <Button variant="outline" onClick={() => setDialog("retry")}>
          <RefreshCw aria-hidden="true" /> Mark for retry
        </Button>
      )}
      {payment.status === "SUCCESS" && (
        <Button variant="destructive" onClick={() => setDialog("refund")}>
          <Undo2 aria-hidden="true" /> Refund
        </Button>
      )}

      <ConfirmDialog
        open={dialog === "retry"}
        onOpenChange={(open) => !open && close()}
        title="Mark for retry"
        // No payment gateway is connected, so nothing is charged here: the
        // payment only goes back to Pending.
        description={`Nothing is charged now -- no payment gateway is connected. The ${formatCurrency(payment.amount, payment.currency)} payment goes back to Pending, to be collected again through ${payment.gateway}.`}
        confirmLabel="Mark for retry"
        pendingLabel="Saving..."
        isPending={retry.isPending}
        onConfirm={async () => {
          if (await retry.run(payment.id)) close();
        }}
      />

      <FormDialog
        open={dialog === "refund"}
        onOpenChange={(open) => !open && close()}
        title="Refund payment"
        description={`${payment.platformUser?.name ?? "This user"} · ${payment.plan.name}`}
        size="sm"
      >
        <RefundForm payment={payment} onDone={close} />
      </FormDialog>
    </div>
  );
};

export default PaymentDetailActions;
