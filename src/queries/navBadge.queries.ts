import { queryOptions, type QueryClient } from "@tanstack/react-query";
import type { NavBadgeKind } from "@/lib/navItem";
import { queryKeys } from "@/lib/queryKeys";
import { getPayoutStats } from "@/services/adminFeed.services";
import { securityFlagsSummaryQuery } from "./security.queries";
import { ticketStatsQuery } from "./ticket.queries";

// The payout requests waiting for review, beside Referrals & Payouts.
export const payoutStatsQuery = () =>
  queryOptions({
    queryKey: queryKeys.referralPayoutStats,
    queryFn: () => getPayoutStats(),
  });

// Loads a menu count on the server. The counts read the same queries as the
// Support and Security tabs, so a change on those pages updates the menu too.
export const prefetchNavBadge: Record<NavBadgeKind, (client: QueryClient) => Promise<void>> = {
  payoutRequests: (client) => client.prefetchQuery(payoutStatsQuery()),
  openTickets: (client) => client.prefetchQuery(ticketStatsQuery()),
  securityFlags: (client) => client.prefetchQuery(securityFlagsSummaryQuery()),
};
