"use client";

import { useQuery } from "@tanstack/react-query";
import TabsNav from "@/components/shared/TabsNav";
import { featureRequestsQuery } from "@/queries/featureRequest.queries";
import { ticketStatsQuery } from "@/queries/ticket.queries";
import { openTicketCount } from "@/lib/tickets";
import { NEEDS_TRIAGE_STATUSES } from "./FeatureRequests/featureRequestOptions";

// Each tab carries what is waiting there: open tickets, and requests nobody
// has decided on yet (new, or being looked at).
const SupportTabs = () => {
  const stats = useQuery(ticketStatsQuery()).data?.data;
  const requests = useQuery(featureRequestsQuery()).data?.data;
  const openTickets = stats && openTicketCount(stats.statusCounts);
  const untriagedRequests = requests?.filter((request) => NEEDS_TRIAGE_STATUSES.includes(request.status)).length;

  return (
    <TabsNav
      label="Support"
      tabs={[
        { label: "Tickets", href: "/admin/support", count: openTickets },
        { label: "Feature requests", href: "/admin/feature-requests", count: untriagedRequests },
      ]}
    />
  );
};

export default SupportTabs;
