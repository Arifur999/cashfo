import Link from "next/link";
import Card from "@/components/smartly/Card";
import { formatAmount } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { shortPaymentId } from "@/lib/payments";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IPaymentDetail } from "@/types/payment.types";
import T from "@/components/shared/T";
import { getTranslator } from "@/lib/i18n/locale";

// When the money moved, by what happened to it: tried (failed), started
// (still waiting), or paid.
const MOMENT_LABEL = { FAILED: "Tried at", PENDING: "Started at", SUCCESS: "Paid at", REFUNDED: "Paid at" } as const;

// The facts of the payment, as the design lists them: id, the gateway's
// reference, plan, amount with the coupon, when, the invoice.
const PaymentDetailsCard = async ({ payment }: { payment: IPaymentDetail }) => {
  const { t, locale } = await getTranslator("admin");
  const discount = payment.discountApplied ? Number(payment.discountApplied) : 0;
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Payment ID", value: <code className="font-mono">{shortPaymentId(payment.id)}</code> },
    { label: t("{gateway} reference", { gateway: t(humanizeEnum(payment.gateway)) }), value: payment.gatewayReferenceId ? <code className="font-mono">{payment.gatewayReferenceId}</code> : <span className="text-ink-muted"><T>None recorded</T></span> },
    { label: "Plan", value: payment.plan.name },
    {
      label: "Amount",
      // The paisa only when there are some, the coupon's share included.
      value: t(discount > 0 ? (payment.couponCode ? "{amount} ({off} off with {code})" : "{amount} ({off} off)") : "{amount} (no coupon)", {
        amount: formatAmount(payment.amount, payment.currency, locale),
        off: formatAmount(discount, payment.currency, locale),
        code: payment.couponCode ?? "",
      }),
    },
    { label: MOMENT_LABEL[payment.status], value: formatDate(payment.paidAt ?? payment.createdAt, "d MMM yyyy, h:mm:ss aaa", "—", locale) },
    {
      label: "Invoice",
      value: payment.invoice ? (
        <Link href={`/admin/invoices/${payment.invoice.id}`} className="font-semibold text-emerald hover:underline">
          {payment.invoice.invoiceNumber}
        </Link>
      ) : (
        <span className="text-ink-muted"><T>None</T></span>
      ),
    },
  ];

  return (
    <Card asChild padding="md" className="flex flex-col gap-4">
      <section aria-labelledby="payment-details">
        <h2 id="payment-details" className="text-title text-ink">
          <T>Details</T>
        </h2>
        <dl className="grid gap-x-4 gap-y-3 text-body sm:grid-cols-[160px_minmax(0,1fr)]">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-ink-muted">{t(row.label)}</dt>
              <dd className="font-medium text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </Card>
  );
};

export default PaymentDetailsCard;
