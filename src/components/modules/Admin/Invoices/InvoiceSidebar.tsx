import Link from "next/link";
import PrintButton from "@/components/shared/PrintButton";
import { formatCurrency } from "@/lib/currency";
import { shortPaymentId } from "@/lib/payments";
import { cn } from "@/lib/utils";
import type { IInvoiceDetail, IInvoiceListItem } from "@/types/invoice.types";
import T from "@/components/shared/T";
import { getTranslator } from "@/lib/i18n/locale";

interface InvoiceSidebarProps {
  invoice: IInvoiceDetail;
  recent: IInvoiceListItem[];
}

// Beside the sheet: what to do with it, and the latest invoices to hop to.
const InvoiceSidebar = async ({ invoice, recent }: InvoiceSidebarProps) => {
  const { t } = await getTranslator("admin");
  return (
    <aside aria-label={t("Invoice actions")} className="flex flex-col gap-3 print:hidden">
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-5 py-4 shadow-card">
        <h2 className="text-title text-ink">{invoice.invoiceNumber}</h2>
        {invoice.payment && <span className="text-small text-ink-2">{t("Made automatically when {id} was paid.", { id: shortPaymentId(invoice.payment.id) })}</span>}
        <PrintButton label="Print / Save as PDF" className="h-10 w-full rounded-md bg-emerald text-body font-semibold text-white shadow-[0_1px_2px_rgba(11,61,46,0.14)] hover:bg-forest" />
        {invoice.payment && (
          <Link href={`/admin/payments/${invoice.payment.id}`} className="text-small font-semibold text-emerald hover:underline">
            <T>Open the payment</T>
          </Link>
        )}
      </section>
      <section className="flex flex-col gap-2 rounded-lg border border-line bg-surface px-5 py-4 shadow-card">
        <h2 className="text-body font-semibold text-ink"><T>Recent invoices</T></h2>
        {recent.map((item) => {
          const current = item.id === invoice.id;
          return (
            <Link key={item.id} href={`/admin/invoices/${item.id}`} className="flex justify-between gap-2 border-t border-surface-sunken py-2 text-small text-ink hover:text-emerald">
              <span className="flex min-w-0 flex-col">
                <code className={cn("font-mono", current ? "font-bold" : "font-medium")}>{item.invoiceNumber}</code>
                <span className="truncate text-ink-muted">{item.issuedTo}</span>
              </span>
              <b className="font-semibold tabular-nums">{formatCurrency(item.totalAmount, undefined, 0)}</b>
            </Link>
          );
        })}
      </section>
    </aside>
  );
};

export default InvoiceSidebar;
