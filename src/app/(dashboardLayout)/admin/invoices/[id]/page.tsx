import InvoiceDocument from "@/components/modules/Admin/Invoices/InvoiceDocument";
import InvoiceSidebar from "@/components/modules/Admin/Invoices/InvoiceSidebar";
import PaymentsTabs, { PAYMENTS_PAGE } from "@/components/modules/Admin/Payments/PaymentsTabs";
import PageHeader from "@/components/shared/PageHeader";
import { canManage } from "@/lib/authUtils";
import { fetchOrNotFound } from "@/lib/axios/fetchOrNotFound";
import { getUserInfo } from "@/services/auth.services";
import { getInvoiceById, getInvoices } from "@/services/invoice.services";
import { adminPageTitle } from "@/lib/i18n/locale";
import BreadcrumbTitle from "@/components/modules/Dashboard/BreadcrumbTitle";

export const generateMetadata = adminPageTitle("Invoice");

const InvoiceDetailPage = async ({ params }: PageProps<"/admin/invoices/[id]">) => {
  const { id } = await params;
  const [invoice, recent, admin] = await Promise.all([
    fetchOrNotFound(getInvoiceById(id)),
    getInvoices("page=1&limit=4")
      .then((response) => response.data)
      .catch(() => []),
    getUserInfo(),
  ]);

  return (
    <div className="space-y-4">
      <BreadcrumbTitle title={invoice.invoiceNumber} />
      <div className="print:hidden">
        <PageHeader {...PAYMENTS_PAGE} />
      </div>
      <div className="print:hidden">
        <PaymentsTabs showRevenue={canManage(admin?.role, "revenue")} />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <InvoiceDocument invoice={invoice} />
        <InvoiceSidebar invoice={invoice} recent={recent} />
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
