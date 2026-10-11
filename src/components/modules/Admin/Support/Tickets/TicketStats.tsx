"use client";

import { useQuery } from "@tanstack/react-query";
import StatsGrid from "@/components/shared/StatsGrid";
import { formatHours, formatNumber } from "@/lib/number";
import { ticketStatsQuery } from "@/queries/ticket.queries";

// A client query (prefetched by the page) rather than server props, so a
// ticket change anywhere invalidates tickets.all and the counters follow.
const TicketStats = () => {
  const stats = useQuery(ticketStatsQuery()).data?.data;
  // The API reports 0 until a ticket has been resolved -- that's "no data",
  // not "instant".
  const avgResolutionHours = stats && stats.avgResolutionHours > 0 ? stats.avgResolutionHours : null;

  return (
    <StatsGrid
      items={[
        { title: "Open", value: formatNumber(stats?.openCount), iconName: "Inbox", description: "Waiting for a first response" },
        { title: "In Progress", value: formatNumber(stats?.inProgressCount), iconName: "Clock" },
        { title: "Avg Resolution", value: formatHours(avgResolutionHours), iconName: "Timer", description: "Opened to resolved" },
        { title: "Urgent", value: formatNumber(stats?.urgentCount), iconName: "AlertTriangle", description: "Unresolved, urgent priority" },
      ]}
    />
  );
};

export default TicketStats;
