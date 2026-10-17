import type { Metadata } from "next";
import PaymentStats from "@/components/modules/Admin/Payments/PaymentStats";
import PaymentsTable from "@/components/modules/Admin/Payments/PaymentsTable";
import PaymentsTabs, { PAYMENTS_PAGE } from "@/components/modules/Admin/Payments/PaymentsTabs";
import { PAYMENTS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Payments/paymentsTable.config";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { buildTableQueryString } from "@/lib/queryString";
import { paymentsListQuery, paymentStatsQuery } from "@/queries/payment.queries";
import { plansQuery } from "@/queries/plan.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Payments" };

const PaymentsPage = async ({ searchParams }: PageProps<"/admin/payments">) => {
  const [params, admin] = await Promise.all([searchParams, getUserInfo()]);
  const queryString = buildTableQueryString(params, PAYMENTS_TABLE_BASE_CONFIG);

  return (
    <div className="space-y-4">
      <PageHeader {...PAYMENTS_PAGE} />
      <PaymentsTabs showRevenue={canManage(admin?.role, "revenue")} />
      <QueryPrefetch
        prefetch={(client) =>
          Promise.all([
            client.prefetchQuery(paymentsListQuery(queryString)),
            client.prefetchQuery(paymentStatsQuery()),
            client.prefetchQuery(plansQuery()),
          ])
        }
      >
        <PaymentStats />
        <PaymentsTable canRetry={canManage(admin?.role, "payments")} />
      </QueryPrefetch>
    </div>
  );
};

export default PaymentsPage;
