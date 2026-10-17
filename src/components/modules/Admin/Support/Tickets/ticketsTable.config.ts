import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import { TICKET_TAB_LABEL } from "@/lib/tickets";
import { TICKET_STATUSES, type IAdminOption, type TicketStatus } from "@/types/ticket.types";
import { TICKET_CATEGORY_OPTIONS, TICKET_PRIORITY_OPTIONS } from "../ticketOptions";

// What the page needs to build the identical query string on the server.
export const TICKETS_TABLE_BASE_CONFIG = {
  queryKeys: ["search", "status", "priority", "category", "assignedToAdminId"],
  defaultLimit: 10,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;

// The assignee chip lists the admin roster and the status tabs carry the
// counts, both from the API, so the full config is built once they load
// (memoize the result -- it must stay stable).
export const buildTicketsTableConfig = (admins: IAdminOption[], statusCounts?: Record<TicketStatus, number>): ServerDataTableConfig => ({
  ...TICKETS_TABLE_BASE_CONFIG,
  search: { placeholder: "Search subject, name or email", width: "sm" },
  filters: [
    { id: "status", type: "tabs", label: "Status", options: TICKET_STATUSES.map((value) => ({ value, label: TICKET_TAB_LABEL[value], count: statusCounts?.[value] })) },
    { id: "assignedToAdminId", type: "single-select", label: "Assigned", options: admins.map((admin) => ({ value: admin.id, label: admin.name })) },
    { id: "category", type: "single-select", label: "Type", options: TICKET_CATEGORY_OPTIONS },
    { id: "priority", type: "single-select", label: "Priority", options: TICKET_PRIORITY_OPTIONS },
  ],
});
