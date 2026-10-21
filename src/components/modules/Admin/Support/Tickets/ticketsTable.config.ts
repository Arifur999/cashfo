import type { DataTableFilterOption } from "@/components/shared/table/dataTable.types";
import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { TICKET_TABS, ticketCount } from "@/lib/tickets";
import type { IAdminOption, TicketStatus } from "@/types/ticket.types";
import { TICKET_CATEGORY_OPTIONS, TICKET_PRIORITY_OPTIONS } from "../ticketOptions";

// What the page needs to build the identical query string on the server.
// The inbox opens on everything still in the queue. The API searches the
// subject and the requester's name and email.
export const TICKETS_TABLE_BASE_CONFIG = {
  queryKeys: ["status", "search", "priority", "category", "assignedToAdminId"],
  defaults: { status: "IN_QUEUE" },
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaults">;

// The done tab holds closed tickets as well as resolved ones, so it says so.
const TAB_LABEL: Partial<Record<string, string>> = { DONE: "Resolved or closed" };

// Whoever is reading first, as "Me", then the rest of the roster.
export const buildAssigneeOptions = (admins: IAdminOption[], currentAdminId: string | null): DataTableFilterOption[] => {
  const me = admins.find((admin) => admin.id === currentAdminId);
  const others = admins.filter((admin) => admin !== me).map((admin) => ({ value: admin.id, label: admin.name }));
  return me ? [{ value: me.id, label: "Me" }, ...others] : others;
};

// The board's toolbar: the status tabs and the search on top, then who has
// it, how urgent and its type. The assignee chip lists the admin roster and
// the tabs carry the counts, both from the API, so the full config is built
// once they load (memoize the result -- it must stay stable).
export const buildTicketsTableConfig = (admins: IAdminOption[], statusCounts?: Record<TicketStatus, number>, currentAdminId: string | null = null): ServerDataTableConfig => ({
  ...TICKETS_TABLE_BASE_CONFIG,
  search: { placeholder: "Search subject, name or email", width: "sm" },
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
  ],
});
