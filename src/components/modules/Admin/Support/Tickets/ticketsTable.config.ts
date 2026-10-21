import type { DataTableFilterOption } from "@/components/shared/table/dataTable.types";
import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { TICKET_TABS, ticketCount } from "@/lib/tickets";
import type { IAdminOption, TicketStatus } from "@/types/ticket.types";
import { TICKET_CATEGORY_OPTIONS, TICKET_PRIORITY_OPTIONS } from "../ticketOptions";

// What the page needs to build the identical query string on the server.
// The inbox opens on everything still in the queue. The API searches the
// subject and the requester's name and email; awaitingReply=true keeps the
// tickets whose last message is the customer's (the figures' "Need a
// reply"), and sort=waiting puts the longest wait first.
export const TICKETS_TABLE_BASE_CONFIG = {
  queryKeys: ["status", "search", "priority", "category", "assignedToAdminId", "awaitingReply", "sort"],
  defaults: { status: "IN_QUEUE" },
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaults">;

// The Assigned filter's value for tickets nobody has picked up.
export const UNASSIGNED = "none";

// The queue's own order (the API's default, never put in the URL), then
// the longest wait first.
export const QUEUE_ORDER = "queue";
const SORT_OPTIONS: DataTableFilterOption[] = [
  { value: QUEUE_ORDER, label: "Queue order" },
  { value: "waiting", label: "Waiting longest first" },
];

// Whoever is reading first, as "Me", then the tickets nobody has, then
// the rest of the roster.
export const buildAssigneeOptions = (admins: IAdminOption[], currentAdminId: string | null): DataTableFilterOption[] => {
  const me = admins.find((admin) => admin.id === currentAdminId);
  const others = admins.filter((admin) => admin !== me).map((admin) => ({ value: admin.id, label: admin.name, raw: true }));
  const unassigned = { value: UNASSIGNED, label: "Unassigned" };
  return me ? [{ value: me.id, label: "Me" }, unassigned, ...others] : [unassigned, ...others];
};

// The OPEN tab reads "Open": "Need a reply" belongs to the figure above the
// queue and its "Waiting on us" toggle (any unsolved ticket the customer
// wrote last), a different count from the tickets whose status is OPEN.
const TAB_LABEL: Partial<Record<string, string>> = { OPEN: "Open" };

// The board's toolbar: the status tabs and the search on top, then who has
// it, how urgent, its type and whether it waits on us, with the order at
// the end. The assignee chip lists the admin roster and the tabs carry the
// counts, both from the API, so the full config is built once they load
// (memoize the result -- it must stay stable).
export const buildTicketsTableConfig = (admins: IAdminOption[], statusCounts?: Record<TicketStatus, number>, currentAdminId: string | null = null): ServerDataTableConfig => ({
  ...TICKETS_TABLE_BASE_CONFIG,
  // The wider box: the placeholder is cut at 240px, and in Bangla, where
  // the tabs are wider, it wraps under them instead.
  search: { placeholder: "Search subject, name or email", width: "md" },
  filters: [
    {
      id: "status",
      type: "tabs",
      label: "Status",
      options: TICKET_TABS.map((tab) => ({ value: tab.value, label: TAB_LABEL[tab.value] ?? tab.label, count: statusCounts && ticketCount(statusCounts, tab.statuses) })),
    },
    { id: "assignedToAdminId", type: "single-select", label: "Assigned", allLabel: "Anyone", options: buildAssigneeOptions(admins, currentAdminId) },
    { id: "priority", type: "single-select", label: "Priority", options: TICKET_PRIORITY_OPTIONS },
    { id: "category", type: "single-select", label: "Type", options: TICKET_CATEGORY_OPTIONS },
    { id: "awaitingReply", type: "toggle", label: "Waiting on us" },
    { id: "sort", type: "sort", label: "Sort", options: SORT_OPTIONS, defaultValue: QUEUE_ORDER },
  ],
});
