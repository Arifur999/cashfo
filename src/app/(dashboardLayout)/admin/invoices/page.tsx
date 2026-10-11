import type { Metadata } from "next";
import { INVOICES_TABLE_CONFIG } from "@/components/modules/Admin/Invoices/invoicesTable.config";
import InvoicesTable from "@/components/modules/Admin/Invoices/InvoicesTable";
import PaymentsTabs from "@/components/modules/Admin/Payments/PaymentsTabs";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { buildTableQueryString } from "@/lib/queryString";
import { invoicesListQuery } from "@/queries/invoice.queries";

export const metadata: Metadata = { title: "Invoices" };

const InvoicesPage = async ({ searchParams }: PageProps<"/admin/invoices">) => {
  const queryString = buildTableQueryString(await searchParams, INVOICES_TABLE_CONFIG);

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Generated for every successful payment." />
      <PaymentsTabs />
      <QueryPrefetch prefetch={(client) => client.prefetchQuery(invoicesListQuery(queryString))}>
        <InvoicesTable />
      </QueryPrefetch>
    </div>
  );
};

export default InvoicesPage;
