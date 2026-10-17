import type { Metadata } from "next";
import { INVOICES_TABLE_CONFIG } from "@/components/modules/Admin/Invoices/invoicesTable.config";
import InvoicesTable from "@/components/modules/Admin/Invoices/InvoicesTable";
import PaymentsTabs, { PAYMENTS_PAGE } from "@/components/modules/Admin/Payments/PaymentsTabs";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { buildTableQueryString } from "@/lib/queryString";
import { invoicesListQuery } from "@/queries/invoice.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Invoices" };

const InvoicesPage = async ({ searchParams }: PageProps<"/admin/invoices">) => {
  const [params, admin] = await Promise.all([searchParams, getUserInfo()]);
  const queryString = buildTableQueryString(params, INVOICES_TABLE_CONFIG);

  return (
    <div className="space-y-4">
      <PageHeader {...PAYMENTS_PAGE} />
      <PaymentsTabs showRevenue={canManage(admin?.role, "revenue")} />
      <QueryPrefetch prefetch={(client) => client.prefetchQuery(invoicesListQuery(queryString))}>
        <InvoicesTable />
      </QueryPrefetch>
    </div>
  );
};

export default InvoicesPage;
