import Link from "next/link";
import { formatAmount } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { PAYMENT_STATUS_LABEL, shortPaymentId } from "@/lib/payments";
import { cn } from "@/lib/utils";
import type { IOtherPayment } from "@/types/payment.types";
import T from "@/components/shared/T";

// The same person's other payments, newest first, each a link.
const OtherPaymentsCard = ({ payments }: { payments: IOtherPayment[] }) => {
  return (
    <section aria-labelledby="other-payments" className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
      <h2 id="other-payments" className="px-5 py-4 text-title text-ink">
        <T>Their other payments</T>
      </h2>
      {payments.length === 0 ? (
        <p className="border-t border-surface-sunken px-5 py-3 text-small text-ink-muted"><T>This is their only payment.</T></p>
      ) : (
        payments.map((payment) => (
          <Link key={payment.id} href={`/admin/payments/${payment.id}`} className="flex items-center gap-3 border-t border-surface-sunken px-5 py-3 text-small hover:bg-cream/60">
            <code className="font-mono font-semibold text-ink">{shortPaymentId(payment.id)}</code>
            <span className="grow text-ink-muted">
              {formatDate(payment.createdAt, "d MMM yyyy")}
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
    </section>
  );
};

export default OtherPaymentsCard;
