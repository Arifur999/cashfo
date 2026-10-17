import TicketDetailView from "@/components/modules/Admin/Support/TicketDetail/TicketDetailView";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { fetchOrNotFound } from "@/lib/axios/fetchOrNotFound";
import { assignableAdminsQuery, ticketDetailQuery } from "@/queries/ticket.queries";
import { getUserInfo } from "@/services/auth.services";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Support ticket");

const TicketDetailPage = async ({ params }: PageProps<"/admin/support/[id]">) => {
  const [{ id }, admin] = await Promise.all([params, getUserInfo()]);

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
      <TicketDetailView ticketId={id} currentAdminId={admin?.id ?? null} canManage={canManage(admin?.role, "support")} />
    </QueryPrefetch>
  );
};

export default TicketDetailPage;
