import Link from "next/link";
import Card from "@/components/smartly/Card";
import { LIST_DIVIDER, LIST_HOVER } from "@/components/smartly/list/recipes";
import PrintButton from "@/components/shared/PrintButton";
import { formatAmount } from "@/lib/currency";
import { shortPaymentId } from "@/lib/payments";
import { cn } from "@/lib/utils";
import type { IInvoiceDetail, IInvoiceListItem } from "@/types/invoice.types";
import T from "@/components/shared/T";
import { getTranslator } from "@/lib/i18n/locale";
import { invoiceHref, splitIssuedTo } from "./invoiceDisplay";

interface InvoiceSidebarProps {
  invoice: IInvoiceDetail;
  recent: IInvoiceListItem[];
  // The list's query the page was opened with, kept when hopping to
  // another invoice so "All invoices" still leads back to it.
  back?: string;
}

// Beside the sheet: what to do with it, and the latest invoices to hop to
// (not shown when they couldn't be read). The open one is marked as the
// current page. A plain column, not an <aside>: it sits inside the page's
// main, and its two sections are named landmarks of their own.
const InvoiceSidebar = async ({ invoice, recent, back }: InvoiceSidebarProps) => {
  const { t, locale } = await getTranslator("admin");
  return (
    <div className="flex flex-col gap-3 print:hidden">
      <Card asChild padding="none" className="flex flex-col gap-3 px-5 py-4">
        <section aria-label={t("Invoice actions")}>
          <h2 className="text-title text-ink">{invoice.invoiceNumber}</h2>
          {invoice.payment && <span className="text-small text-ink-2">{t("Made automatically when {id} was paid.", { id: shortPaymentId(invoice.payment.id) })}</span>}
          <PrintButton label="Print / Save as PDF" variant="action" className="w-full" />
          {invoice.payment && (
            <Link href={`/admin/payments/${invoice.payment.id}`} className="text-small font-semibold text-emerald hover:underline">
              <T>Open the payment</T>
            </Link>
          )}
        </section>
      </Card>
      {recent.length > 0 && (
        <Card asChild padding="none" className="overflow-hidden">
          <section aria-labelledby="recent-invoices">
            <h2 id="recent-invoices" className="px-5 py-3 text-body font-semibold text-ink">
              <T>Recent invoices</T>
            </h2>
            {recent.map((item) => {
              const current = item.id === invoice.id;
              return (
                <Link
                  key={item.id}
                  href={invoiceHref(item.id, back)}
                  aria-current={current ? "page" : undefined}
                  className={cn("flex justify-between gap-2 border-t px-5 py-2.5 text-small text-ink", LIST_DIVIDER, current ? "bg-mint-50" : LIST_HOVER)}
                >
                  <span className="flex min-w-0 flex-col">
                    <code className={cn("font-mono", current ? "font-bold" : "font-medium")}>{item.invoiceNumber}</code>
                    <span className="truncate text-ink-muted">{splitIssuedTo(item.issuedTo).name}</span>
                  </span>
                  <b className="font-semibold tabular-nums">{formatAmount(item.totalAmount, undefined, locale)}</b>
                </Link>
              );
            })}
          </section>
        </Card>
      )}
    </div>
  );
};

export default InvoiceSidebar;
