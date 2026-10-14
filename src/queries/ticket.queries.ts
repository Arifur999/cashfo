import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getAssignableAdmins, getTicketById, getTicketStats, getTickets, searchCustomers } from "@/services/ticket.services";

export const ticketsListQuery = (queryString: string) =>
  queryOptions({
    queryKey: queryKeys.tickets.list(queryString),
    queryFn: () => getTickets(queryString),
  });

// Under tickets.all, so every ticket mutation refreshes the counters too.
export const ticketStatsQuery = () =>
  queryOptions({
    queryKey: [...queryKeys.tickets.all, "stats"] as const,
    queryFn: () => getTicketStats(),
  });

export const ticketDetailQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.tickets.detail(id),
    queryFn: () => getTicketById(id),
  });

// The admin roster barely changes, so one fetch serves the filter, the
// assignee picker and the message thread's sender names for a while.
export const assignableAdminsQuery = () =>
  queryOptions({
    queryKey: [...queryKeys.admins.all, "assignable"] as const,
    queryFn: () => getAssignableAdmins(),
    staleTime: 5 * 60 * 1000,
  });

export const USER_SEARCH_MIN_LENGTH = 2;

// Users are the "owners" domain (/admin/users); searching under it means an
// owner mutation also drops stale search results.
export const platformUserSearchQuery = (search: string) =>
  queryOptions({
    queryKey: [...queryKeys.owners.all, "search", search] as const,
    queryFn: () => searchCustomers(search),
    enabled: search.length >= USER_SEARCH_MIN_LENGTH,
    staleTime: 30 * 1000,
  });
