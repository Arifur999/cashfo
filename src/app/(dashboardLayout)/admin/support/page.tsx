import { redirect } from "next/navigation";
import { SUPPORT_PAGE } from "@/components/modules/Admin/Support/supportPage";
import { TICKETS_ROUTE } from "@/components/modules/Admin/Support/ticketLinks";
import SupportHeaderActions from "@/components/modules/Admin/Support/SupportHeaderActions";
import SupportTabs from "@/components/modules/Admin/Support/SupportTabs";
import TicketStats from "@/components/modules/Admin/Support/Tickets/TicketStats";
import { ticketsQueryString } from "@/components/modules/Admin/Support/Tickets/ticketsTable.config";
import TicketsTable from "@/components/modules/Admin/Support/Tickets/TicketsTable";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { pageHref, pastEnd } from "@/lib/table/pageParams";
import { featureRequestsQuery } from "@/queries/featureRequest.queries";
import { assignableAdminsQuery, ticketStatsQuery, ticketsListQuery } from "@/queries/ticket.queries";
import { getUserInfo } from "@/services/auth.services";
import { getTickets } from "@/services/ticket.services";
import { adminPageTitle } from "@/lib/i18n/locale";

// The tab is Tickets; Feature requests is its sibling.
export const generateMetadata = adminPageTitle("Tickets");

const SupportPage = async ({ searchParams }: PageProps<"/admin/support">) => {
  const [params, admin] = await Promise.all([searchParams, getUserInfo()]);
  const queryString = ticketsQueryString(params);
  // The page is fetched here rather than only prefetched, so a page past
  // the end (an old link, tickets solved since) opens the last one, filters
  // kept, instead of first saying the queue is empty. An outage is left to
  // the table, which says the queue didn't load.
  const tickets = await getTickets(queryString).catch(() => null);
  const last = tickets?.meta ? pastEnd(tickets.meta.page, tickets.meta.totalPage, tickets.meta.total) : null;
  if (last !== null) redirect(pageHref(TICKETS_ROUTE, params, last));

  return (
    <div className="space-y-4.5">
      <PageHeader {...SUPPORT_PAGE} actions={<SupportHeaderActions canManage={canManage(admin?.role, "support")} />} />
      <QueryPrefetch
        prefetch={(client) => {
          // Still one request: the rows fetched above seed the table's query.
          if (tickets) client.setQueryData(ticketsListQuery(queryString).queryKey, tickets);
          return Promise.all([client.prefetchQuery(ticketStatsQuery()), client.prefetchQuery(assignableAdminsQuery()), client.prefetchQuery(featureRequestsQuery())]);
        }}
      >
        <SupportTabs />
        <TicketStats />
        <TicketsTable currentAdminId={admin?.id ?? null} />
      </QueryPrefetch>
    </div>
  );
};

export default SupportPage;
