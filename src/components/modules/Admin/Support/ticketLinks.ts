import { TICKETS_TABLE_BASE_CONFIG } from "./Tickets/ticketsTable.config";

// Plain helpers for the links between the ticket queue and a ticket. Pure,
// so the Server Component page and the client table build the same hrefs.

export const TICKETS_ROUTE = "/admin/support";

// A ticket's page reads the queue it was opened from (its tab, filters and
// page) from this param, so its way back returns to the same rows. The same
// name the people pages use.
export const TICKET_BACK_PARAM = "back";

// What the way back may carry: the queue's own params, nothing else.
const LIST_KEYS: readonly string[] = [...TICKETS_TABLE_BASE_CONFIG.queryKeys, "page", "limit"];

// A ticket's page, carrying the queue's query when there is one.
export const ticketHref = (id: string, listQuery = ""): string => {
  const href = `${TICKETS_ROUTE}/${encodeURIComponent(id)}`;
  return listQuery ? `${href}?${new URLSearchParams({ [TICKET_BACK_PARAM]: listQuery }).toString()}` : href;
};

// The way back from a ticket: the queue, with whatever of ?back= is the
// queue's own. It is only ever read as a query, so it can't lead anywhere
// but the queue.
export const ticketsBackHref = (back: string | string[] | undefined): string => {
  const raw = Array.isArray(back) ? back[0] : back;
  if (!raw) return TICKETS_ROUTE;
  const kept = new URLSearchParams();
  new URLSearchParams(raw).forEach((value, key) => {
    if (value !== "" && LIST_KEYS.includes(key)) kept.append(key, value);
  });
  const query = kept.toString();
  return query ? `${TICKETS_ROUTE}?${query}` : TICKETS_ROUTE;
};

// The requester's other tickets in the queue, found by their email: the
// open ones while any are open (they still need the team), else the solved.
export const requesterTicketsHref = (email: string, history: { total: number; solved: number }): string => {
  const params = new URLSearchParams({ search: email });
  if (history.total > 0 && history.solved === history.total) params.set("status", "DONE");
  return `${TICKETS_ROUTE}?${params.toString()}`;
};

// Whether the queue's URL narrows it beyond its default tab, so an empty
// list can say "nothing matches" only when something was asked for.
export const hasTicketFilters = (params: { get: (key: string) => string | null }): boolean => {
  const defaults: Readonly<Record<string, string>> = TICKETS_TABLE_BASE_CONFIG.defaults;
  return TICKETS_TABLE_BASE_CONFIG.queryKeys.some((key) => {
    const value = params.get(key);
    return value !== null && value !== "" && value !== defaults[key];
  });
};
