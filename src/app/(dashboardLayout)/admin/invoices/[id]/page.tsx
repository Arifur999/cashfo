import InvoiceDocument from "@/components/modules/Admin/Invoices/InvoiceDocument";
import { invoiceListQuery, invoicePaymentStatus, invoiceRefund } from "@/components/modules/Admin/Invoices/invoiceDisplay";
import InvoiceSidebar from "@/components/modules/Admin/Invoices/InvoiceSidebar";
import PaymentsTabs, { PAYMENTS_PAGE } from "@/components/modules/Admin/Payments/PaymentsTabs";
import PageHeader from "@/components/shared/PageHeader";
import { canManage } from "@/lib/authUtils";
import { getUserInfo } from "@/services/auth.services";
import { fetchOrNotFound } from "@/lib/axios/fetchOrNotFound";
import { getInvoiceById, getInvoices } from "@/services/invoice.services";
import { adminPageTitle } from "@/lib/i18n/locale";
import BreadcrumbTitle from "@/components/modules/Dashboard/BreadcrumbTitle";

// The tab title comes from the route, never a read: Next runs this for every
// prefetch of a link to the page without rendering it, and every invoice
// number on the list is one. The number shows in the breadcrumb and on the
// sheet.
export const generateMetadata = adminPageTitle("Invoice");

// Laid out like a payment's page: the way back to the list, then the
// record, whose sheet carries the page's heading. The invoice brings its
// payment's status and refund, so a refunded sheet needs no second read.
const InvoiceDetailPage = async ({ params, searchParams }: PageProps<"/admin/invoices/[id]">) => {
  const [{ id }, { back }] = await Promise.all([params, searchParams]);
  // The list it was opened from (dates, page), for every way back.
  const fromList = invoiceListQuery(Array.isArray(back) ? back[0] : back);
  const [invoice, recent, admin] = await Promise.all([
    fetchOrNotFound(getInvoiceById(id)),
    getInvoices("page=1&limit=4")
      .then((response) => response.data)
      .catch(() => []),
    getUserInfo(),
  ]);

  return (
    <div className="flex flex-col gap-4.5">
      <BreadcrumbTitle title={invoice.invoiceNumber} />
      {/* The section's header and tabs over the sheet, as the board draws
          it: the Invoices tab is the way back to the list. */}
      <div className="flex flex-col gap-4 print:hidden">
        <PageHeader {...PAYMENTS_PAGE} />
        <PaymentsTabs showRevenue={canManage(admin?.role, "revenue")} />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <InvoiceDocument invoice={invoice} refunded={invoicePaymentStatus(invoice) === "REFUNDED"} refund={invoiceRefund(invoice)} />
        <InvoiceSidebar invoice={invoice} recent={recent} back={fromList} canEmail={canManage(admin?.role, "payments")} />
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
