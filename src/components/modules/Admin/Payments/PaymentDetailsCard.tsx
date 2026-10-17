import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { shortPaymentId } from "@/lib/payments";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IPaymentDetail } from "@/types/payment.types";
import T from "@/components/shared/T";
import { getTranslator } from "@/lib/i18n/locale";

// The facts of the payment, as the design lists them: id, the gateway's
// reference, plan, amount with the coupon, when, the invoice.
const PaymentDetailsCard = async ({ payment }: { payment: IPaymentDetail }) => {
  const { t } = await getTranslator("admin");
  const discount = payment.discountApplied ? Number(payment.discountApplied) : 0;
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Payment ID", value: <code className="font-mono">{shortPaymentId(payment.id)}</code> },
    { label: t("{gateway} reference", { gateway: t(humanizeEnum(payment.gateway)) }), value: payment.gatewayReferenceId ? <code className="font-mono">{payment.gatewayReferenceId}</code> : <span className="text-ink-muted"><T>None recorded</T></span> },
    { label: "Plan", value: payment.plan.name },
    {
      label: "Amount",
      value: t(discount > 0 ? (payment.couponCode ? "{amount} ({off} off with {code})" : "{amount} ({off} off)") : "{amount} (no coupon)", {
        amount: formatCurrency(payment.amount, payment.currency),
        off: formatCurrency(discount, payment.currency, 0),
        code: payment.couponCode ?? "",
      }),
    },
    { label: payment.status === "FAILED" ? "Tried at" : "Paid at", value: formatDate(payment.paidAt ?? payment.createdAt, "d MMM yyyy, h:mm:ss aaa") },
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
    <section aria-labelledby="payment-details" className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-card">
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
  );
};

export default PaymentDetailsCard;
