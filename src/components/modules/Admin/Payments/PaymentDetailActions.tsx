"use client";

import { Download, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { retryPaymentAction } from "@/app/(dashboardLayout)/admin/payments/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import FormDialog from "@/components/shared/dialog/FormDialog";
import Button from "@/components/smartly/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatCurrency } from "@/lib/currency";
import { shortPaymentId } from "@/lib/payments";
import { queryKeys } from "@/lib/queryKeys";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IPaymentDetail } from "@/types/payment.types";
import RefundForm from "./RefundForm";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The design's 38px secondary buttons; Refund in red.
const BUTTON = "h-9.5";
const DANGER = "border-chart-expense text-expense hover:bg-expense-soft";

// The invoice for anyone who can see the payment; retry (a failed payment)
// and refund (a paid one) for those who can change payments.
const PaymentDetailActions = ({ payment, canManage }: { payment: IPaymentDetail; canManage: boolean }) => {
  const [dialog, setDialog] = useState<"retry" | "refund" | null>(null);
  const close = () => setDialog(null);
  const { translate } = useLocale();
  const retry = useActionMutation({
    action: retryPaymentAction,
    successMessage: "Payment set back to Waiting",
    invalidateKeys: [queryKeys.payments.all],
    refreshRoute: true,
  });

  return (
    <>
      {payment.invoice && (
        <Button asChild variant="secondary" className={BUTTON}>
          <Link href={`/admin/invoices/${payment.invoice.id}`}>
            <Download className="size-3.75 text-ink-2" aria-hidden="true" />
            <T>Invoice</T>
          </Link>
        </Button>
      )}
      {canManage && payment.status === "FAILED" && (
        <Button variant="secondary" className={BUTTON} onClick={() => setDialog("retry")}>
          <T>Retry</T>
        </Button>
      )}
      {canManage && payment.status === "SUCCESS" && (
        <Button variant="secondary" className={`${BUTTON} ${DANGER}`} onClick={() => setDialog("refund")}>
          <RefreshCcw className="size-3.75" aria-hidden="true" />
          <T>Refund</T>
        </Button>
      )}

      <ConfirmDialog
        open={dialog === "retry"}
        onOpenChange={(open) => !open && close()}
        title={translate("Retry {id}?", { id: shortPaymentId(payment.id) })}
        // No payment gateway is connected, so nothing is charged here: the
        // payment only goes back to Waiting.
        description={translate("Nothing is charged now. The {amount} payment goes back to Waiting, to be collected again through {gateway}.", {
          amount: formatCurrency(payment.amount, payment.currency),
          gateway: translate(humanizeEnum(payment.gateway)),
        })}
        confirmLabel="Retry"
        pendingLabel="Saving..."
        isPending={retry.isPending}
        onConfirm={async () => {
          if (await retry.run(payment.id)) close();
        }}
      />

      <FormDialog open={dialog === "refund"} onOpenChange={(open) => !open && close()} title={translate("Refund {id}", { id: shortPaymentId(payment.id) })} size="md">
        <RefundForm payment={payment} onDone={close} />
      </FormDialog>
    </>
  );
};

export default PaymentDetailActions;
