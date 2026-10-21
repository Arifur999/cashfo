"use client";

import { retryPaymentAction } from "@/app/(dashboardLayout)/admin/payments/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatAmount } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { shortPaymentId } from "@/lib/payments";
import { queryKeys } from "@/lib/queryKeys";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IPayment } from "@/types/payment.types";

interface RetryPaymentDialogProps {
  // The caller keeps the payment after the dialog closes, so its title
  // stays put while the dialog animates out.
  payment: Pick<IPayment, "id" | "amount" | "currency" | "gateway"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Retrying a failed payment asks first, from the list and from the
// payment's page alike. No payment gateway is connected, so nothing is
// charged: the payment only goes back to Waiting. The pending state keeps a
// second press from sending a second request.
const RetryPaymentDialog = ({ payment, open, onOpenChange }: RetryPaymentDialogProps) => {
  const { translate } = useLocale();
  const retry = useActionMutation({
    action: retryPaymentAction,
    successMessage: "Payment set back to Waiting",
    invalidateKeys: [queryKeys.payments.all],
    refreshRoute: true,
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={payment ? translate("Retry {id}?", { id: shortPaymentId(payment.id) }) : ""}
      description={
        payment
          ? translate("Nothing is charged now. The {amount} payment goes back to Waiting until {gateway} confirms it, and it can't be marked as paid from here.", {
              amount: formatAmount(payment.amount, payment.currency),
              gateway: translate(humanizeEnum(payment.gateway)),
            })
          : ""
      }
      confirmLabel="Retry"
      pendingLabel="Saving..."
      isPending={retry.isPending}
      onConfirm={async () => {
        if (payment && (await retry.run(payment.id))) onOpenChange(false);
      }}
    />
  );
};

export default RetryPaymentDialog;
