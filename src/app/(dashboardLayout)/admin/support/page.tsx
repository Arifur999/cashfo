import type { Metadata } from "next";
import { SUPPORT_PAGE } from "@/components/modules/Admin/Support/supportPage";
import SupportTabs from "@/components/modules/Admin/Support/SupportTabs";
import TicketStats from "@/components/modules/Admin/Support/Tickets/TicketStats";
import { TICKETS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Support/Tickets/ticketsTable.config";
import TicketsTable from "@/components/modules/Admin/Support/Tickets/TicketsTable";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { buildTableQueryString } from "@/lib/queryString";
import { featureRequestsQuery } from "@/queries/featureRequest.queries";
import { assignableAdminsQuery, ticketStatsQuery, ticketsListQuery } from "@/queries/ticket.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Support" };

const SupportPage = async ({ searchParams }: PageProps<"/admin/support">) => {
  const [params, admin] = await Promise.all([searchParams, getUserInfo()]);
  const queryString = buildTableQueryString(params, TICKETS_TABLE_BASE_CONFIG);

  return (
    <div className="space-y-4">
      <PageHeader {...SUPPORT_PAGE} />
      <QueryPrefetch
        prefetch={(client) =>
          Promise.all([
            client.prefetchQuery(ticketStatsQuery()),
            client.prefetchQuery(ticketsListQuery(queryString)),
            client.prefetchQuery(assignableAdminsQuery()),
            client.prefetchQuery(featureRequestsQuery()),
          ])
        }
      >
        <SupportTabs />
        <TicketStats />
        <TicketsTable canManage={canManage(admin?.role, "support")} />
      </QueryPrefetch>
    </div>
  );
};

export default SupportPage;
