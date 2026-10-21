import Link from "next/link";
import Card from "@/components/smartly/Card";
import { LIST_DIVIDER, LIST_HOVER } from "@/components/smartly/list/recipes";
import { formatAmount } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { PAYMENT_STATUS_LABEL, shortPaymentId } from "@/lib/payments";
import { cn } from "@/lib/utils";
import type { IOtherPayment } from "@/types/payment.types";
import T from "@/components/shared/T";
import { getTranslator } from "@/lib/i18n/locale";
import { OTHER_PAYMENTS_SHOWN, PAYMENTS_LIST_HREF, paymentHref } from "./paymentsDisplay";

// The list rows' recipe, at the card's 20px edge.
const ROW = cn("flex items-center gap-3 border-t px-5 py-3 text-small", LIST_DIVIDER, LIST_HOVER);

interface OtherPaymentsCardProps {
  payments: IOtherPayment[];
  // Their email, for the whole history once the five newest are shown.
  email?: string | null;
  // The list this payment was opened from, carried on to the next one.
  back?: string;
}

// The same person's other payments, newest first, each a link. The API
// sends the five newest, so five lead on to all of them in the list.
const OtherPaymentsCard = async ({ payments, email, back }: OtherPaymentsCardProps) => {
  const { locale } = await getTranslator("admin");
  return (
    <Card asChild padding="none" className="overflow-hidden">
      <section aria-labelledby="other-payments">
        <h2 id="other-payments" className="px-5 py-4 text-title text-ink">
          <T>Their other payments</T>
        </h2>
        {payments.length === 0 ? (
          <p className="border-t border-divider px-5 py-3 text-small text-ink-muted"><T>This is their only payment.</T></p>
        ) : (
          payments.map((payment) => (
            <Link key={payment.id} href={paymentHref(payment.id, back)} className={ROW}>
              <code className="font-mono font-semibold text-ink">{shortPaymentId(payment.id)}</code>
              <span className="grow text-ink-muted">
                {formatDate(payment.createdAt, "d MMM yyyy", "—", locale)}
                {payment.status !== "SUCCESS" && (
                  <>
                    {" · "}
                    <T>{PAYMENT_STATUS_LABEL[payment.status]}</T>
                  </>
                )}
              </span>
              <b className={cn("font-semibold tabular-nums", payment.status === "SUCCESS" ? "text-ink" : "text-ink-muted")}>{formatAmount(payment.amount, payment.currency)}</b>
            </Link>
          ))
        )}
        {payments.length >= OTHER_PAYMENTS_SHOWN && email && (
          <Link href={`${PAYMENTS_LIST_HREF}?search=${encodeURIComponent(email)}`} className={cn(ROW, "font-semibold text-emerald")}>
            <T>See all their payments</T>
          </Link>
        )}
      </section>
    </Card>
  );
};

export default OtherPaymentsCard;
