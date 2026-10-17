import Chip from "@/components/smartly/Chip";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { formatCurrency } from "@/lib/currency";
import { PAYMENT_STATUS_LABEL, paymentLine, shortPaymentId } from "@/lib/payments";
import type { IPaymentDetail } from "@/types/payment.types";
import T from "@/components/shared/T";
import { getTranslator } from "@/lib/i18n/locale";

interface PaymentHeroProps {
  payment: IPaymentDetail;
  actions?: React.ReactNode;
}

// The payment in one card: its id with the status, what it was for and
// who paid, the amount, and the actions on the right.
const PaymentHero = async ({ payment, actions }: PaymentHeroProps) => {
  const { t } = await getTranslator("admin");
  return (
    <section aria-label={t("Payment {id}", { id: shortPaymentId(payment.id) })} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-card lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-h2 text-ink">{shortPaymentId(payment.id)}</h1>
          <StatusBadgeCell status={payment.status} label={PAYMENT_STATUS_LABEL[payment.status]} dot />
          {payment.duplicateOfId && (
            <Chip tone="warning" size="sm">
              <T>Looks like a double charge</T>
            </Chip>
          )}
        </div>
        <p className="text-body text-ink-2">{paymentLine(payment, t)}</p>
      </div>
      <span className="text-h1 text-ink tabular-nums">{formatCurrency(payment.amount, payment.currency)}</span>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </section>
  );
};

export default PaymentHero;
