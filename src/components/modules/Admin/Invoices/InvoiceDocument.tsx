import Logo from "@/components/smartly/Logo";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { shortPaymentId } from "@/lib/payments";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IInvoiceDetail } from "@/types/invoice.types";

// The invoice as a printable sheet, drawn as the design draws it: Smartly
// at the top left, the number and PAID at the right, who it went to, the
// lines, and the totals. The dashboard chrome is print:hidden.
const InvoiceDocument = ({ invoice }: { invoice: IInvoiceDetail }) => {
  const currency = invoice.payment?.currency;
  const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const discount = Math.max(0, Math.round((subtotal - Number(invoice.totalAmount)) * 100) / 100);

  return (
    <article aria-label={`Invoice ${invoice.invoiceNumber}`} className="flex flex-col gap-8 rounded-sm border border-line bg-surface px-12 py-10 shadow-float print:border-0 print:shadow-none">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <Logo variant="icon" height={36} alt="" />
          <span className="flex flex-col">
            <b className="text-title text-ink">Smartly</b>
            <span className="text-small text-ink-muted">Dhaka, Bangladesh</span>
          </span>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="text-h1 text-ink">Invoice</span>
          <code className="font-mono text-small text-ink-2">{invoice.invoiceNumber}</code>
          <span className="rounded-full bg-mint-50 px-3 py-0.5 text-caption font-bold text-emerald">PAID</span>
        </div>
      </div>

      <div className="grid gap-5 text-body leading-relaxed sm:grid-cols-3">
        <div className="flex flex-col">
          <span className="text-caption font-semibold text-ink-muted">Issued to</span>
          <b className="font-semibold text-ink">{invoice.issuedTo}</b>
        </div>
        <div className="flex flex-col">
          <span className="text-caption font-semibold text-ink-muted">Date</span>
          <b className="font-semibold text-ink">{formatDate(invoice.createdAt, "d MMM yyyy")}</b>
          {invoice.payment && <span className="text-ink-2">Payment {shortPaymentId(invoice.payment.id)}</span>}
        </div>
        <div className="flex flex-col">
          <span className="text-caption font-semibold text-ink-muted">Paid with</span>
          <b className="font-semibold text-ink">{invoice.payment?.gateway ? humanizeEnum(invoice.payment.gateway) : "—"}</b>
          {invoice.payment?.plan && <span className="text-ink-2">{invoice.payment.plan.name}</span>}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="grid grid-cols-[minmax(0,1fr)_120px] border-b-2 border-ink py-3 text-caption font-semibold text-ink-2">
          <span>Description</span>
          <span className="text-right">Amount</span>
        </div>
        {invoice.lineItems.map((item, index) => (
          <div key={`${item.description}-${index}`} className="grid grid-cols-[minmax(0,1fr)_120px] border-b border-line py-4 text-body">
            <span className="font-semibold text-ink">{item.description}</span>
            <span className="text-right text-ink tabular-nums">{formatCurrency(item.amount, currency)}</span>
          </div>
        ))}
        <div className="flex flex-col items-end gap-2 pt-4 text-body tabular-nums">
          <span className="grid grid-cols-[140px_120px] text-right">
            <span className="text-ink-muted">Subtotal</span>
            <span className="text-ink">{formatCurrency(subtotal, currency)}</span>
          </span>
          <span className="grid grid-cols-[140px_120px] text-right">
            <span className="text-ink-muted">Discount</span>
            <span className="text-ink">{formatCurrency(discount, currency)}</span>
          </span>
          <span className="grid grid-cols-[140px_120px] border-t border-line pt-2 text-right text-h3 text-ink">
            <span>Total paid</span>
            <span>{formatCurrency(invoice.totalAmount, currency)}</span>
          </span>
        </div>
      </div>

      <span className="text-small text-ink-muted">Thank you for using Smartly. Questions about this invoice? Reply from the Help page in the app.</span>
    </article>
  );
};

export default InvoiceDocument;
