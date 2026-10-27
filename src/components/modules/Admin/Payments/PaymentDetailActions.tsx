"use client";

import { Check, Download, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import Button from "@/components/smartly/Button";
import { shortPaymentId } from "@/lib/payments";
import type { IPaymentDetail } from "@/types/payment.types";
import { MarkPaymentFailedDialog, MarkPaymentPaidDialog } from "./MarkPaymentDialogs";
import RefundForm from "./RefundForm";
import RetryPaymentDialog from "./RetryPaymentDialog";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The design's 38px secondary buttons; Refund in red, with the red-outline
// line the tokens keep for it.
const BUTTON = "h-9.5";
const DANGER = "border-expense-line text-expense hover:bg-expense-soft";

// The invoice for anyone who can see the payment; for those who can change
// payments, Mark paid and Mark failed (a waiting checkout, confirmed by
// hand), Retry (a failed one) and Refund (a paid one).
const PaymentDetailActions = ({ payment, canManage }: { payment: IPaymentDetail; canManage: boolean }) => {
  const [dialog, setDialog] = useState<"retry" | "refund" | "paid" | "failed" | null>(null);
  const close = () => setDialog(null);
  const { translate } = useLocale();

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
      {canManage && payment.status === "PENDING" && (
        <>
          <Button variant="secondary" className={`${BUTTON} ${DANGER}`} onClick={() => setDialog("failed")}>
            <T>Mark failed</T>
          </Button>
          <Button variant="primary" className={BUTTON} onClick={() => setDialog("paid")}>
            <Check className="size-3.75" aria-hidden="true" />
            <T>Mark paid</T>
          </Button>
        </>
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

      <RetryPaymentDialog payment={payment} open={dialog === "retry"} onOpenChange={(open) => !open && close()} />
      <MarkPaymentPaidDialog payment={payment} open={dialog === "paid"} onOpenChange={(open) => !open && close()} />
      <MarkPaymentFailedDialog payment={payment} open={dialog === "failed"} onOpenChange={(open) => !open && close()} />

      <FormDialog open={dialog === "refund"} onOpenChange={(open) => !open && close()} title={translate("Refund {id}", { id: shortPaymentId(payment.id) })} size="md">
        <RefundForm payment={payment} onDone={close} />
      </FormDialog>
    </>
  );
};

export default PaymentDetailActions;
