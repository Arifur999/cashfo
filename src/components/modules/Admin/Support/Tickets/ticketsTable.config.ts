import type { ServerDataTableConfig } from "@/hooks/useServerDataTable";
import type { IAdminOption } from "@/types/ticket.types";
import { TICKET_CATEGORY_OPTIONS, TICKET_PRIORITY_OPTIONS, TICKET_STATUS_OPTIONS } from "../ticketOptions";

// What the page needs to build the identical query string on the server.
export const TICKETS_TABLE_BASE_CONFIG = {
  queryKeys: ["search", "status", "priority", "category", "assignedToAdminId"],
  defaultLimit: 10,
} as const satisfies Pick<ServerDataTableConfig, "queryKeys" | "defaultLimit">;

// The assignee filter lists the admin roster, which comes from the API, so
// the full config is built once it loads (memoize the result -- it must stay
// stable).
export const buildTicketsTableConfig = (admins: IAdminOption[]): ServerDataTableConfig => ({
  ...TICKETS_TABLE_BASE_CONFIG,
  search: { placeholder: "Search subject, user name or email..." },
  filters: [
    { id: "status", type: "single-select", label: "Status", options: TICKET_STATUS_OPTIONS },
    { id: "priority", type: "single-select", label: "Priority", options: TICKET_PRIORITY_OPTIONS },
    { id: "category", type: "single-select", label: "Category", options: TICKET_CATEGORY_OPTIONS },
    { id: "assignedToAdminId", type: "single-select", label: "Assignee", options: admins.map((admin) => ({ value: admin.id, label: admin.name })) },
  ],
});
