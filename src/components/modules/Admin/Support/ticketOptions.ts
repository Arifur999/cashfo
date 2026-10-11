import { enumOptions } from "@/lib/statusBadge";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from "@/types/ticket.types";

// One option list per ticket enum, shared by the table filters, the new
// ticket form and the detail page's controls.
export const TICKET_STATUS_OPTIONS = enumOptions(TICKET_STATUSES);
export const TICKET_PRIORITY_OPTIONS = enumOptions(TICKET_PRIORITIES);
export const TICKET_CATEGORY_OPTIONS = enumOptions(TICKET_CATEGORIES);
