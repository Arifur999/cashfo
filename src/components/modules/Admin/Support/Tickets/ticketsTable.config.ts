import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { TICKET_TABS, ticketCount } from "@/lib/tickets";
import type { IAdminOption, TicketStatus } from "@/types/ticket.types";
import { TICKET_CATEGORY_OPTIONS } from "../ticketOptions";

// What the page needs to build the identical query string on the server.
// The inbox opens on everything still in the queue.
export const TICKETS_TABLE_BASE_CONFIG = {
  queryKeys: ["status", "category", "assignedToAdminId"],
  defaults: { status: "IN_QUEUE" },
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaults">;

// The board's toolbar: the status tabs, then who has it and its type on the
// right. The assignee chip lists the admin roster and the tabs carry the
// counts, both from the API, so the full config is built once they load
// (memoize the result -- it must stay stable).
export const buildTicketsTableConfig = (admins: IAdminOption[], statusCounts?: Record<TicketStatus, number>): ServerDataTableConfig => ({
  ...TICKETS_TABLE_BASE_CONFIG,
  filters: [
    { id: "status", type: "tabs", label: "Status", options: TICKET_TABS.map((tab) => ({ value: tab.value, label: tab.label, count: statusCounts && ticketCount(statusCounts, tab.statuses) })) },
    { id: "assignedToAdminId", type: "single-select", label: "Assigned", allLabel: "Anyone", align: "end", options: admins.map((admin) => ({ value: admin.id, label: admin.name })) },
    { id: "category", type: "single-select", label: "Type", align: "end", options: TICKET_CATEGORY_OPTIONS },
  ],
});
