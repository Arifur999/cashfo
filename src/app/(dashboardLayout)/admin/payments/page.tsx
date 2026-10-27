import { redirect } from "next/navigation";
import PaymentStats from "@/components/modules/Admin/Payments/PaymentStats";
import PaymentsTable from "@/components/modules/Admin/Payments/PaymentsTable";
import PaymentsTabs, { PAYMENTS_PAGE } from "@/components/modules/Admin/Payments/PaymentsTabs";
import { failedSinceDay, listQuery, PAYMENTS_LIST_HREF } from "@/components/modules/Admin/Payments/paymentsDisplay";
import { PAYMENTS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Payments/paymentsTable.config";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { buildTableQueryString } from "@/lib/queryString";
import { paymentsListQuery, paymentStatsQuery } from "@/queries/payment.queries";
import { plansQuery } from "@/queries/plan.queries";
import { getUserInfo } from "@/services/auth.services";
import { adminPageTitle } from "@/lib/i18n/locale";
import ExportLink from "@/components/modules/Admin/Payments/ExportLink";

export const generateMetadata = adminPageTitle("Payments");

const PaymentsPage = async ({ searchParams }: PageProps<"/admin/payments">) => {
  const [params, admin] = await Promise.all([searchParams, getUserInfo()]);
  // Older links ask for ?view=failed: they open the Failed tab, keeping
  // whatever else of the list they named.
  if (params.view === "failed") {
    const named = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => [value ?? []].flat().forEach((item) => named.append(key, item)));
    const query = new URLSearchParams(listQuery(named.toString()));
    query.set("status", "FAILED");
    query.delete("page");
    redirect(`${PAYMENTS_LIST_HREF}?${query.toString()}`);
  }
  const queryString = buildTableQueryString(params, PAYMENTS_TABLE_BASE_CONFIG);
  // Read here, on the server: a client component mustn't read the clock
  // while it renders.
  const failedSince = failedSinceDay();
  // Export takes the list's filters (not its page) to the API's spreadsheet.
  const exportQuery = new URLSearchParams(queryString);
  exportQuery.delete("page");
  exportQuery.delete("limit");

  return (
    <div className="space-y-4">
      <PageHeader {...PAYMENTS_PAGE} actions={<ExportLink href={`${PAYMENTS_LIST_HREF}/export${exportQuery.size ? `?${exportQuery}` : ""}`} />} />
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
        <PaymentStats failedSince={failedSince} />
        <PaymentsTable canRetry={canManage(admin?.role, "payments")} />
      </QueryPrefetch>
    </div>
  );
};

export default PaymentsPage;
