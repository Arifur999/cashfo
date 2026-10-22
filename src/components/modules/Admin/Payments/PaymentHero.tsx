import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { formatAmount } from "@/lib/currency";
import { PAYMENT_STATUS_LABEL, paymentLine, shortPaymentId } from "@/lib/payments";
import type { IPaymentDetail } from "@/types/payment.types";
import T from "@/components/shared/T";
import { getTranslator } from "@/lib/i18n/locale";
import { paymentBadge, refundExtent } from "./paymentsDisplay";

interface PaymentHeroProps {
  payment: IPaymentDetail;
  actions?: React.ReactNode;
}

// The payment in one card: its id with the status, what it was for and
// who paid, the amount, and the actions on the right. A partial refund says
// how much went back, so the full amount beside "Refunded" doesn't read as
// all of it.
const PaymentHero = async ({ payment, actions }: PaymentHeroProps) => {
  const { t, locale } = await getTranslator("admin");
  const partlyRefunded = refundExtent(payment.amount, payment.refund) === "part";
  return (
    <Card asChild padding="md" className="flex flex-col gap-4 lg:flex-row lg:items-center">
      <section aria-label={t("Payment {id}", { id: shortPaymentId(payment.id) })}>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-h2 text-ink">{shortPaymentId(payment.id)}</h1>
            {/* Amber while waiting; a partial refund keeps "Refunded" with its own chip. */}
            <StatusBadgeCell status={payment.status} label={PAYMENT_STATUS_LABEL[payment.status]} tone={paymentBadge({ status: payment.status }).tone} dot />
            {partlyRefunded && payment.refund && (
              <Chip tone="warning" size="sm">
                {t("Partly refunded: {amount}", { amount: formatAmount(payment.refund.amount, payment.currency, locale) })}
              </Chip>
            )}
            {payment.duplicateOfId && (
              <Chip tone="warning" size="sm">
                <T>Looks like a double charge</T>
              </Chip>
            )}
          </div>
          <p className="text-body text-ink-2">{paymentLine(payment, t, locale)}</p>
        </div>
        <span className="text-h1 text-ink tabular-nums">{formatAmount(payment.amount, payment.currency, locale)}</span>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </section>
    </Card>
  );
};

export default PaymentHero;
