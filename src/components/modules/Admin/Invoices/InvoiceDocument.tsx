import Logo from "@/components/smartly/Logo";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { shortPaymentId } from "@/lib/payments";
import { humanizeEnum } from "@/lib/statusBadge";
import { cn } from "@/lib/utils";
import type { IInvoiceDetail } from "@/types/invoice.types";
import T from "@/components/shared/T";
import { getTranslator } from "@/lib/i18n/locale";
import { invoiceStamp, splitIssuedTo, type InvoiceStamp } from "./invoiceDisplay";

// The stamp's words and tone: mint once paid, neutral when it all went
// back, amber when part of it did.
const STAMP: Record<InvoiceStamp, { label: string; className: string }> = {
  paid: { label: "PAID", className: "bg-mint-50 text-emerald" },
  refunded: { label: "REFUNDED", className: "bg-surface-sunken text-ink-2" },
  "partly-refunded": { label: "PARTLY REFUNDED", className: "bg-warning-soft text-warning" },
};

// One line of the totals: the label, then the amount under the Amount column.
const TOTAL_ROW = "grid grid-cols-[auto_120px] gap-x-4 text-right";

// The sheet's small capitals over each block and column.
const LABEL = "text-caption font-semibold tracking-[0.04em] text-ink-muted uppercase";

// "2 Oct – 1 Nov 2026": the period a line paid for.
const periodText = (from: string | null | undefined, to: string | null | undefined, locale: "en" | "bn") => {
  if (!from || !to) return null;
  const sameYear = formatDate(from, "yyyy", "", locale) === formatDate(to, "yyyy", "", locale);
  return `${formatDate(from, sameYear ? "d MMM" : "d MMM yyyy", "—", locale)} – ${formatDate(to, "d MMM yyyy", "—", locale)}`;
};

interface InvoiceDocumentProps {
  invoice: IInvoiceDetail;
  // The payment went back: its refund, when it could be read.
  refunded?: boolean;
  refund?: { amount: string; createdAt: string } | null;
}

// The invoice as a printable sheet, drawn as the design draws it: Smartly
// at the top left, the number and its stamp at the right, who it went to,
// the lines, and the totals. The dashboard chrome is print:hidden. A
// refunded payment's sheet says so, and how much went back, so a printed
// copy never claims it was all kept.
const InvoiceDocument = async ({ invoice, refunded = false, refund = null }: InvoiceDocumentProps) => {
  const { t, locale } = await getTranslator("admin");
  const currency = invoice.payment?.currency;
  const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const discount = Math.max(0, Math.round((subtotal - Number(invoice.totalAmount)) * 100) / 100);
  const stamp = STAMP[invoiceStamp(invoice.totalAmount, refunded, refund)];
  const issuedTo = splitIssuedTo(invoice.issuedTo);
  // Every amount on the sheet with its paisa, as a receipt prints them.
  const money = (value: string | number) => formatCurrency(value, currency, 2, locale);
  const period = periodText(invoice.payment?.periodStart, invoice.payment?.periodEnd, locale);

  return (
    <article
      aria-labelledby="invoice-title"
      // Room for the sheet's content on a phone, the design's wide margins from sm up.
      className="flex flex-col gap-8 rounded-sm border border-line bg-surface px-5 py-6 shadow-float sm:px-12 sm:py-10 print:border-0 print:shadow-none"
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <Logo variant="icon" height={36} alt="" />
          <span className="flex flex-col">
            <b className="text-title text-ink"><T>Smartly</T></b>
            <span className="text-small text-ink-muted"><T>Dhaka, Bangladesh</T></span>
          </span>
        </div>
        {/* At the right, on its own line too when a phone wraps the header. */}
        <div className="ml-auto flex flex-col items-end gap-1 text-right">
          {/* The page's heading: the invoice and its number. */}
          <h1 id="invoice-title" className="flex flex-col items-end gap-1">
            <span className="text-h1 text-ink"><T>Invoice</T></span>
            <code className="font-mono text-small font-normal text-ink-2">{invoice.invoiceNumber}</code>
          </h1>
          <span className={cn("rounded-full px-3 py-0.5 text-caption font-bold", stamp.className)}>{t(stamp.label)}</span>
        </div>
      </div>

      <div className="grid gap-5 text-body leading-relaxed sm:grid-cols-3">
        <div className="flex min-w-0 flex-col">
          <span className={LABEL}><T>Issued to</T></span>
          <b className="font-semibold wrap-break-word text-ink">{issuedTo.name}</b>
          {issuedTo.email && <span className="break-all text-ink-2">{issuedTo.email}</span>}
        </div>
        <div className="flex flex-col">
          <span className={LABEL}><T>Date</T></span>
          <b className="font-semibold text-ink">{formatDate(invoice.createdAt, "d MMM yyyy", "—", locale)}</b>
          {invoice.payment && <span className="text-ink-2">{t("Payment {id}", { id: shortPaymentId(invoice.payment.id) })}</span>}
        </div>
        <div className="flex flex-col">
          <span className={LABEL}><T>Paid with</T></span>
          <b className="font-semibold text-ink">{invoice.payment?.gateway ? t(humanizeEnum(invoice.payment.gateway)) : "—"}</b>
          {invoice.payment?.payerAccount ? (
            <span className="text-ink-2">{t("From {account}", { account: invoice.payment.payerAccount })}</span>
          ) : (
            invoice.payment?.plan && <span className="text-ink-2">{invoice.payment.plan.name}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <div className={cn("grid gap-x-3 border-b-2 border-ink py-3 text-ink-2", LABEL, period ? "grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_120px]" : "grid-cols-[minmax(0,1fr)_120px]")}>
          <span><T>Description</T></span>
          {period && <span><T>Period</T></span>}
          <span className="text-right"><T>Amount</T></span>
        </div>
        {invoice.lineItems.map((item, index) => (
          <div key={`${item.description}-${index}`} className={cn("grid gap-x-3 border-b border-line py-4 text-body", period ? "grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_120px]" : "grid-cols-[minmax(0,1fr)_120px]")}>
            <span className="font-semibold text-ink">{item.description}</span>
            {period && <span className="text-ink-2">{index === 0 ? period : ""}</span>}
            <span className="text-right text-ink tabular-nums">{money(item.amount)}</span>
          </div>
        ))}
        <div className="flex flex-col items-end gap-2 pt-4 text-body tabular-nums">
          <span className={TOTAL_ROW}>
            <span className="text-ink-muted"><T>Subtotal</T></span>
            <span className="text-ink">{money(subtotal)}</span>
          </span>
          <span className={TOTAL_ROW}>
            <span className="text-ink-muted"><T>Discount</T></span>
            <span className="text-ink">{money(discount)}</span>
          </span>
          <span className={cn(TOTAL_ROW, "border-t border-line pt-2 text-h3 text-ink")}>
            <span><T>Total paid</T></span>
            <span>{money(invoice.totalAmount)}</span>
          </span>
          {refund && (
            <span className="text-small text-ink-2">
              {t("Refunded {amount} on {date}.", { amount: money(refund.amount), date: formatDate(refund.createdAt, "d MMM yyyy", "—", locale) })}
            </span>
          )}
        </div>
      </div>

      <span className="text-small text-ink-muted"><T>Thank you for using Smartly. Questions about this invoice? Reply from the Help page in the app.</T></span>
    </article>
  );
};

export default InvoiceDocument;
