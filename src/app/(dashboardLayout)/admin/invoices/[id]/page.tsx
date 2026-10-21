import InvoiceDocument from "@/components/modules/Admin/Invoices/InvoiceDocument";
import { invoiceListQuery, invoicePaymentStatus, invoicesListHref } from "@/components/modules/Admin/Invoices/invoiceDisplay";
import InvoiceSidebar from "@/components/modules/Admin/Invoices/InvoiceSidebar";
import BackLink from "@/components/shared/BackLink";
import { fetchOrNotFound } from "@/lib/axios/fetchOrNotFound";
import { getInvoiceById, getInvoices } from "@/services/invoice.services";
import { getPaymentById } from "@/services/payment.services";
import { adminPageTitle } from "@/lib/i18n/locale";
import BreadcrumbTitle from "@/components/modules/Dashboard/BreadcrumbTitle";
import T from "@/components/shared/T";

// The tab title comes from the route, never a read: Next runs this for every
// prefetch of a link to the page without rendering it, and every invoice
// number on the list is one. The number shows in the breadcrumb and on the
// sheet.
export const generateMetadata = adminPageTitle("Invoice");

// What went back on a refunded payment, for the sheet's stamp and its
// "Refunded ... on ..." line. Null when it can't be read: the sheet then
// still says REFUNDED.
const readRefund = (paymentId: string) =>
  getPaymentById(paymentId)
    .then((response) => response.data.refund)
    .catch(() => null);

// Laid out like a payment's page: the way back to the list, then the
// record, whose sheet carries the page's heading.
const InvoiceDetailPage = async ({ params, searchParams }: PageProps<"/admin/invoices/[id]">) => {
  const [{ id }, { back }] = await Promise.all([params, searchParams]);
  // The list it was opened from (dates, page), for every way back.
  const fromList = invoiceListQuery(Array.isArray(back) ? back[0] : back);
  const [invoice, recent] = await Promise.all([
    fetchOrNotFound(getInvoiceById(id)),
    getInvoices("page=1&limit=4")
      .then((response) => response.data)
      .catch(() => []),
  ]);
  const refunded = invoicePaymentStatus(invoice) === "REFUNDED";
  const refund = refunded && invoice.payment ? await readRefund(invoice.payment.id) : null;

  return (
    <div className="flex flex-col gap-4">
      <BreadcrumbTitle title={invoice.invoiceNumber} />
      <BackLink href={invoicesListHref(fromList)} className="print:hidden">
        <T>All invoices</T>
      </BackLink>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <InvoiceDocument invoice={invoice} refunded={refunded} refund={refund} />
        <InvoiceSidebar invoice={invoice} recent={recent} back={fromList} />
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
