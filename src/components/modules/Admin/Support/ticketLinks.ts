import { LIST_BACK_PARAM, LIST_PAGE_KEYS, listBackHref } from "@/lib/navItem";
import { TICKETS_TABLE_BASE_CONFIG } from "./Tickets/ticketsTable.config";

// Plain helpers for the links between the ticket queue and a ticket. Pure,
// so the Server Component page and the client table build the same hrefs.

export const TICKETS_ROUTE = "/admin/support";

// A ticket's page reads the queue it was opened from (its tab, filters and
// page) from this param, so its way back returns to the same rows. The same
// name every record page uses.
export const TICKET_BACK_PARAM = LIST_BACK_PARAM;

// What the way back may carry: the queue's own params, nothing else.
const LIST_KEYS: readonly string[] = [...TICKETS_TABLE_BASE_CONFIG.queryKeys, ...LIST_PAGE_KEYS];

// A ticket's page, carrying the queue's query when there is one.
export const ticketHref = (id: string, listQuery = ""): string => {
  const href = `${TICKETS_ROUTE}/${encodeURIComponent(id)}`;
  return listQuery ? `${href}?${new URLSearchParams({ [TICKET_BACK_PARAM]: listQuery }).toString()}` : href;
};

// The way back from a ticket: the queue, with whatever of ?back= is the
// queue's own. It is only ever read as a query, so it can't lead anywhere
// but the queue.
export const ticketsBackHref = (back: string | readonly string[] | undefined): string => listBackHref(TICKETS_ROUTE, back, LIST_KEYS);

// One tab of the queue ("Open" opens OPEN).
export const ticketStatusHref = (status: string): string => `${TICKETS_ROUTE}?${new URLSearchParams({ status }).toString()}`;

// Every ticket still in the queue whose last message is the customer's:
// what the figures count as needing a reply.
export const AWAITING_REPLY_HREF = `${TICKETS_ROUTE}?awaitingReply=true`;

// A search of the queue by the requester's email: the open tab while any of
// their earlier tickets is open (they still need the team), else the solved.
// It is a search, not the "Earlier tickets" count: it also holds the ticket
// being read when that one is in the tab, and anyone whose name or email
// contains this one, so the card labels it as a search.
export const requesterTicketsHref = (email: string, history: { total: number; solved: number }): string => {
  const params = new URLSearchParams({ search: email });
  if (history.total > 0 && history.solved === history.total) params.set("status", "DONE");
  return `${TICKETS_ROUTE}?${params.toString()}`;
};

// Whether the queue's URL narrows it beyond its default tab, so an empty
// list can say "nothing matches" only when something was asked for. The
// order isn't a filter: it hides nothing.
export const hasTicketFilters = (params: { get: (key: string) => string | null }): boolean => {
  const defaults: Readonly<Record<string, string>> = TICKETS_TABLE_BASE_CONFIG.defaults;
  return TICKETS_TABLE_BASE_CONFIG.queryKeys.some((key) => {
    if (key === "sort") return false;
    const value = params.get(key);
    return value !== null && value !== "" && value !== defaults[key];
  });
};
