import type { Metadata } from "next";
import { getPaymentsView, PAYMENTS_TABLE_CONFIG } from "@/components/modules/Admin/Payments/paymentsTable.config";
import PaymentsTable from "@/components/modules/Admin/Payments/PaymentsTable";
import PaymentsTabs from "@/components/modules/Admin/Payments/PaymentsTabs";
import RevenueOverview from "@/components/modules/Admin/Payments/RevenueOverview";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { buildTableQueryString } from "@/lib/queryString";
import { paymentsListQuery } from "@/queries/payment.queries";
import { getUserInfo } from "@/services/auth.services";
import { getChurn, getRevenueSummary } from "@/services/revenue.services";

export const metadata: Metadata = { title: "Payments" };

// Revenue figures are finance-only; for any other role (or if they fail to
// load) the page simply leaves the overview out.
const loadRevenue = async () => {
  try {
    const [summary, churn] = await Promise.all([getRevenueSummary(), getChurn()]);
    return { summary: summary.data, churn: churn.data };
  } catch {
    return null;
  }
};

const PaymentsPage = async ({ searchParams }: PageProps<"/admin/payments">) => {
  const [params, admin] = await Promise.all([searchParams, getUserInfo()]);
  const view = getPaymentsView(params.view);
  const queryString = buildTableQueryString(params, PAYMENTS_TABLE_CONFIG[view]);
  const revenue = canManage(admin?.role, "revenue") ? await loadRevenue() : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Payment records, revenue, and refunds." />
      {revenue && <RevenueOverview summary={revenue.summary} churn={revenue.churn} />}
      <PaymentsTabs />
      <QueryPrefetch prefetch={(client) => client.prefetchQuery(paymentsListQuery(queryString, view))}>
        <PaymentsTable />
      </QueryPrefetch>
    </div>
  );
};

export default PaymentsPage;
