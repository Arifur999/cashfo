import type { Metadata } from "next";
import SupportTabs from "@/components/modules/Admin/Support/SupportTabs";
import TicketStats from "@/components/modules/Admin/Support/Tickets/TicketStats";
import { TICKETS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Support/Tickets/ticketsTable.config";
import TicketsTable from "@/components/modules/Admin/Support/Tickets/TicketsTable";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { buildTableQueryString } from "@/lib/queryString";
import { assignableAdminsQuery, ticketStatsQuery, ticketsListQuery } from "@/queries/ticket.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Support" };

const SupportPage = async ({ searchParams }: PageProps<"/admin/support">) => {
  const [params, admin] = await Promise.all([searchParams, getUserInfo()]);
  const queryString = buildTableQueryString(params, TICKETS_TABLE_BASE_CONFIG);

  return (
    <div className="space-y-6">
      <PageHeader title="Support" description="Support tickets and feature requests." />
      <QueryPrefetch
        prefetch={(client) =>
          Promise.all([
            client.prefetchQuery(ticketStatsQuery()),
            client.prefetchQuery(ticketsListQuery(queryString)),
            client.prefetchQuery(assignableAdminsQuery()),
          ])
        }
      >
        <TicketStats />
        <SupportTabs />
        <TicketsTable canManage={canManage(admin?.role, "support")} />
      </QueryPrefetch>
    </div>
  );
};

export default SupportPage;
