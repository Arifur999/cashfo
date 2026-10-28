"use client";

import { Copy, Hourglass } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import { cancelCheckoutAction } from "@/lib/customer/billingActions";
import { gatewayLabel, type PendingPayment } from "@/lib/customer/billingDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatRelativeDateTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface PendingPaymentCardProps {
  payment: PendingPayment;
  readOnly: boolean;
  onCancelled: () => void;
}

// A checkout waiting for the money: the steps to send it (in the reader's
// language), the amount, the reference to write with it and until when it
// stays open. No gateway takes the money online yet, so it says plainly
// that the team confirms the payment once it arrives.
export function PendingPaymentCard({ payment, readOnly, onCancelled }: PendingPaymentCardProps) {
  const { t, locale, fmt } = useLocale();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const steps = (locale === "bn" ? payment.instructions.bn : payment.instructions.en) || payment.instructions.en;

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(payment.displayId);
      toast.success(t("Reference copied"));
    } catch {
      toast.error(t("Couldn't copy. Select the text and copy it yourself."));
    }
  }

  function cancel() {
    startTransition(async () => {
      const result = await cancelCheckoutAction(payment.id);
      setConfirming(false);
      if (result.success) {
        toast.success(t("Payment cancelled"));
        onCancelled();
      } else {
        toast.error(t(result.message ?? "Couldn't cancel the payment"));
      }
    });
  }

  const facts = [
    { label: t("Plan"), value: payment.planName },
    { label: t("Amount"), value: formatCurrency(payment.amount, "BDT", fmt) },
    { label: t("Pay with"), value: t(gatewayLabel(payment.gateway)) },
    { label: t("Open until"), value: formatRelativeDateTime(payment.expiresAt, { t, locale: fmt }) },
  ];

  return (
    <Card padding="none" className="overflow-hidden border-warning-line">
      <div className="flex flex-wrap items-start gap-3.5 bg-warning-50 px-4 py-4 md:px-5.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-warning-soft text-warning [&_svg]:size-5">
          <Hourglass aria-hidden="true" />
        </span>
        <span className="flex min-w-56 flex-1 flex-col gap-0.5">
          <h2 className="text-title font-semibold text-ink">{t("Waiting for your payment")}</h2>
          <span className="text-small leading-normal text-warning-ink">{t("There's no online payment yet. Send the money as shown below; our team confirms it once it arrives, and your plan starts then.")}</span>
        </span>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4 md:px-5.5">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-0.5">
              <dt className="text-[12.5px] text-ink-muted">{fact.label}</dt>
              <dd className="text-body font-semibold text-ink tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-strip px-3.5 py-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-[12.5px] text-ink-muted">{t("Reference to write with the payment")}</span>
            <span lang="en" className="font-mono text-h3 font-bold tracking-wider text-ink">
              {payment.displayId}
            </span>
          </span>
          <Button variant="secondary" size="xs" onClick={() => void copyReference()} className="ml-auto pointer-coarse:h-11">
            <Copy aria-hidden="true" />
            {t("Copy")}
          </Button>
        </div>
        <p className="text-body leading-relaxed whitespace-pre-line text-ink-2">{steps}</p>
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setConfirming(true)} disabled={readOnly || isPending} className="border-expense-line text-expense hover:bg-expense-soft pointer-coarse:h-11">
            {isPending && <Loader size={14} />}
            {t("Cancel this payment")}
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={cancel}
        isPending={isPending}
        title={t("Cancel this payment?")}
        description={t("If you already sent the money, keep it open and our team will match it. Otherwise you can start again any time.")}
        confirmLabel={t("Cancel payment")}
        cancelLabel={t("Keep it open")}
      />
    </Card>
  );
}
