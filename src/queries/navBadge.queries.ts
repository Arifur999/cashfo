import type { QueryClient } from "@tanstack/react-query";
import type { NavBadgeKind } from "@/lib/navItem";
import { securityFlagsSummaryQuery } from "./security.queries";
import { ticketStatsQuery } from "./ticket.queries";

// Loads a menu count on the server. The counts read the same queries as the
// Support and Security tabs, so a change on those pages updates the menu too.
export const prefetchNavBadge: Record<NavBadgeKind, (client: QueryClient) => Promise<void>> = {
  openTickets: (client) => client.prefetchQuery(ticketStatsQuery()),
  securityFlags: (client) => client.prefetchQuery(securityFlagsSummaryQuery()),
};
