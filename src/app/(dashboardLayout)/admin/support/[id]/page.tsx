import type { Metadata } from "next";
import TicketDetailView from "@/components/modules/Admin/Support/TicketDetail/TicketDetailView";
import { TICKET_BACK_PARAM, ticketsBackHref } from "@/components/modules/Admin/Support/ticketLinks";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { fetchOrNotFound } from "@/lib/axios/fetchOrNotFound";
import { getTranslator } from "@/lib/i18n/locale";
import { shortTicketId } from "@/lib/tickets";
import { assignableAdminsQuery, ticketDetailQuery } from "@/queries/ticket.queries";
import { getUserInfo } from "@/services/auth.services";

// "Ticket #3F2A1", so several open tickets can be told apart in the tabs.
export async function generateMetadata({ params }: PageProps<"/admin/support/[id]">): Promise<Metadata> {
  const [{ id }, { t }] = await Promise.all([params, getTranslator("admin")]);
  return { title: t("Ticket {id}", { id: shortTicketId(id) }) };
}

const TicketDetailPage = async ({ params, searchParams }: PageProps<"/admin/support/[id]">) => {
  const [{ id }, query, admin] = await Promise.all([params, searchParams, getUserInfo()]);
  // Opened from the queue (?back=), the way back returns to the same tab,
  // filters and page.
  const backHref = ticketsBackHref(query[TICKET_BACK_PARAM]);

  return (
    <QueryPrefetch
      prefetch={(client) =>
        Promise.all([
          // fetchQuery (unlike prefetchQuery) rejects, so an unknown id
          // renders the not-found page instead of an empty view.
          fetchOrNotFound(client.fetchQuery(ticketDetailQuery(id))),
          client.prefetchQuery(assignableAdminsQuery()),
        ])
      }
    >
      <TicketDetailView ticketId={id} currentAdminId={admin?.id ?? null} canManage={canManage(admin?.role, "support")} backHref={backHref} />
    </QueryPrefetch>
  );
};

export default TicketDetailPage;
