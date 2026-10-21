"use client";

import { Download, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import Button from "@/components/smartly/Button";
import { shortPaymentId } from "@/lib/payments";
import type { IPaymentDetail } from "@/types/payment.types";
import RefundForm from "./RefundForm";
import RetryPaymentDialog from "./RetryPaymentDialog";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The design's 38px secondary buttons; Refund in red, with the red-outline
// line the tokens keep for it.
const BUTTON = "h-9.5";
const DANGER = "border-expense-line text-expense hover:bg-expense-soft";

// The invoice for anyone who can see the payment; retry (a failed payment)
// and refund (a paid one) for those who can change payments.
const PaymentDetailActions = ({ payment, canManage }: { payment: IPaymentDetail; canManage: boolean }) => {
  const [dialog, setDialog] = useState<"retry" | "refund" | null>(null);
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

      <FormDialog open={dialog === "refund"} onOpenChange={(open) => !open && close()} title={translate("Refund {id}", { id: shortPaymentId(payment.id) })} size="md">
        <RefundForm payment={payment} onDone={close} />
      </FormDialog>
    </>
  );
};

export default PaymentDetailActions;
