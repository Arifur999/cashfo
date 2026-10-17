"use client";

import { useQuery } from "@tanstack/react-query";
import TabsNav from "@/components/shared/TabsNav";
import { featureRequestsQuery } from "@/queries/featureRequest.queries";
import { ticketStatsQuery } from "@/queries/ticket.queries";

// Each tab carries what is waiting there: open tickets, and requests that
// have not been declined.
const SupportTabs = () => {
  const stats = useQuery(ticketStatsQuery()).data?.data;
  const requests = useQuery(featureRequestsQuery()).data?.data;
  const openTickets = stats ? stats.statusCounts.OPEN + stats.statusCounts.IN_PROGRESS + stats.statusCounts.WAITING_ON_USER : undefined;
  const liveRequests = requests?.filter((request) => request.status !== "DECLINED").length;

  return (
    <TabsNav
      label="Support"
      tabs={[
        { label: "Tickets", href: "/admin/support", count: openTickets },
        { label: "Feature requests", href: "/admin/feature-requests", count: liveRequests },
      ]}
    />
  );
};

export default SupportTabs;
