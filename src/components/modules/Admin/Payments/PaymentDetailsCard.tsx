import Link from "next/link";
import Card from "@/components/smartly/Card";
import { formatAmount } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { shortPaymentId } from "@/lib/payments";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IPaymentDetail } from "@/types/payment.types";
import T from "@/components/shared/T";
import { getTranslator } from "@/lib/i18n/locale";
import type { Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";

// When the money moved, by what happened to it: tried (failed), started
// (still waiting), or paid.
const MOMENT_LABEL = { FAILED: "Tried at", PENDING: "Started at", SUCCESS: "Paid at", REFUNDED: "Paid at" } as const;

// "Monthly Pro · ৳ 299 a month": the plan and its list price per cycle;
// the name alone for a free plan or an older response without the cycle.
const planPrice = (plan: IPaymentDetail["plan"], t: Translate, locale: Locale) => {
  const price = Number(plan.price ?? 0);
  if (!(price > 0) || (plan.billingCycle !== "MONTHLY" && plan.billingCycle !== "YEARLY")) return plan.name;
  return t(plan.billingCycle === "YEARLY" ? "{plan} · {amount} a year" : "{plan} · {amount} a month", { plan: plan.name, amount: formatAmount(price, undefined, locale) });
};

// The facts of the payment, as the design lists them: id, the gateway's
// reference, plan, amount with the coupon, when, the invoice.
const PaymentDetailsCard = async ({ payment }: { payment: IPaymentDetail }) => {
  const { t, locale } = await getTranslator("admin");
  const discount = payment.discountApplied ? Number(payment.discountApplied) : 0;
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Payment ID", value: <code className="font-mono">{shortPaymentId(payment.id)}</code> },
    { label: t("{gateway} reference", { gateway: t(humanizeEnum(payment.gateway)) }), value: payment.gatewayReferenceId ? <code className="font-mono">{payment.gatewayReferenceId}</code> : <span className="text-ink-muted"><T>None recorded</T></span> },
    { label: "Plan", value: planPrice(payment.plan, t, locale) },
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
    // The number or bank account the money came from: sent by the customer
    // at checkout, or typed in at Mark paid.
    ...(payment.payerAccount ? [{ label: "Paid from", value: <code className="font-mono">{payment.payerAccount}</code> }] : []),
    // When the customer sent the number and the TrxID, and their screenshot.
    ...(payment.submittedAt ? [{ label: "Details sent", value: formatDate(payment.submittedAt, "d MMM yyyy, h:mm aaa", "—", locale) }] : []),
    ...(payment.proof
      ? [
          {
            label: "Screenshot",
            value: (
              <a href={`/admin/payments/${payment.id}/proof`} target="_blank" rel="noopener" className="font-semibold text-emerald hover:underline">
                <T>Open the screenshot</T>
              </a>
            ),
          },
        ]
      : []),
    // The period a paid payment bought.
    ...(payment.periodStart && payment.periodEnd
      ? [{ label: "Covers", value: `${formatDate(payment.periodStart, "d MMM", "—", locale)} – ${formatDate(payment.periodEnd, "d MMM yyyy", "—", locale)}` }]
      : []),
    // A checkout still waiting lapses unless someone marks it paid.
    ...(payment.status === "PENDING" && payment.expiresAt ? [{ label: "Lapses at", value: formatDate(payment.expiresAt, "d MMM yyyy, h:mm aaa", "—", locale) }] : []),
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
    <Card asChild padding="none" className="flex flex-col gap-3.5 px-5 py-4.5">
      <section aria-labelledby="payment-details">
        <h2 id="payment-details" className="text-title text-ink">
          <T>Details</T>
        </h2>
        <dl className="grid gap-x-4 gap-y-2.5 text-[13.5px] leading-4 sm:grid-cols-[160px_minmax(0,1fr)]">
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
