import type { DataTableFilterOption } from "@/components/shared/table/dataTable.types";
import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { buildTableQueryString } from "@/lib/queryString";
import { OPEN_TICKET_STATUSES, ticketCount } from "@/lib/tickets";
import type { IAdminOption, ITicketStats, TicketStatus } from "@/types/ticket.types";
import { TICKET_CATEGORY_OPTIONS, TICKET_PRIORITY_OPTIONS } from "../ticketOptions";

// What the page needs to build the identical query string on the server.
// The inbox opens on everything still in the queue. The API searches the
// subject and the requester's name and email; awaitingReply=true keeps the
// tickets whose last message is the customer's, and sort=waiting puts the
// longest wait first. Search and sort have no control of their own on the
// board (the top bar's search finds tickets), but links that carry them
// (a person's "Find their tickets") still narrow the queue.
export const TICKETS_TABLE_BASE_CONFIG = {
  queryKeys: ["status", "search", "priority", "category", "assignedToAdminId", "awaitingReply", "sort"],
  defaults: { status: "IN_QUEUE" },
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaults">;

// The "Need a reply" tab: not a status of its own but every unsolved
// ticket whose last message is the customer's, the longest wait first --
// what the figure above the queue counts.
export const NEEDS_REPLY = "NEEDS_REPLY";

// The board's status tabs, in order. The last holds resolved and closed.
export const TICKET_QUEUE_TABS: { value: string; label: string; statuses?: TicketStatus[] }[] = [
  { value: "IN_QUEUE", label: "All open", statuses: OPEN_TICKET_STATUSES },
  { value: NEEDS_REPLY, label: "Need a reply" },
  { value: "IN_PROGRESS", label: "In progress", statuses: ["IN_PROGRESS"] },
  { value: "WAITING_ON_USER", label: "Waiting on user", statuses: ["WAITING_ON_USER"] },
  { value: "DONE", label: "Resolved", statuses: ["RESOLVED", "CLOSED"] },
];

type ParamsSource = Parameters<typeof buildTableQueryString>[0];

// The API query for the queue's URL: the table's own params, with the
// "Need a reply" tab spelled out as the filters it stands for. The page's
// prefetch and the client table both call this, so they share one key.
export const ticketsQueryString = (source: ParamsSource) => {
  const params = new URLSearchParams(buildTableQueryString(source, TICKETS_TABLE_BASE_CONFIG));
  if (params.get("status") === NEEDS_REPLY) {
    params.set("status", "IN_QUEUE");
    params.set("awaitingReply", "true");
    if (!params.has("sort")) params.set("sort", "waiting");
  }
  return params.toString();
};

// The Assigned filter's value for tickets nobody has picked up.
export const UNASSIGNED = "none";

// Whoever is reading first, as "Me", then the tickets nobody has, then
// the rest of the roster.
export const buildAssigneeOptions = (admins: IAdminOption[], currentAdminId: string | null): DataTableFilterOption[] => {
  const me = admins.find((admin) => admin.id === currentAdminId);
  const others = admins.filter((admin) => admin !== me).map((admin) => ({ value: admin.id, label: admin.name, raw: true }));
  const unassigned = { value: UNASSIGNED, label: "Unassigned" };
  return me ? [{ value: me.id, label: "Me" }, unassigned, ...others] : [unassigned, ...others];
};

// How many tickets a tab holds, from the stats.
const tabCount = (stats: ITicketStats | undefined, tab: (typeof TICKET_QUEUE_TABS)[number]) => {
  if (!stats) return undefined;
  if (tab.value === NEEDS_REPLY) return stats.needsReplyCount ?? stats.statusCounts.OPEN;
  return ticketCount(stats.statusCounts, tab.statuses ?? []);
};

// The board's toolbar, one row: the status tabs on the left, who has it and
// its type on the right, and how urgent beside them. The assignee chip lists
// the admin roster and the tabs carry the counts, both from the API, so the
// full config is built once they load (memoize the result -- it must stay
// stable). The search box shows only while the URL carries a search (a
// link from a person's page), so it can be read and cleared.
export const buildTicketsTableConfig = (admins: IAdminOption[], stats?: ITicketStats, currentAdminId: string | null = null, searching = false): ServerDataTableConfig => ({
  ...TICKETS_TABLE_BASE_CONFIG,
  search: searching ? { placeholder: "Search subject, name or email", width: "sm" } : undefined,
  filters: [
    {
      id: "status",
      type: "tabs",
      label: "Status",
      options: TICKET_QUEUE_TABS.map((tab) => ({ value: tab.value, label: tab.label, count: tabCount(stats, tab) })),
    },
    { id: "assignedToAdminId", type: "single-select", label: "Assigned", allLabel: "Anyone", options: buildAssigneeOptions(admins, currentAdminId), align: "end" },
    { id: "category", type: "single-select", label: "Type", allLabel: "All", options: TICKET_CATEGORY_OPTIONS, align: "end" },
    { id: "priority", type: "single-select", label: "Priority", allLabel: "All", options: TICKET_PRIORITY_OPTIONS, align: "end" },
  ],
});
