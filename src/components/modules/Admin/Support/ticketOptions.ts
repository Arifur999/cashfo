import { type BadgeTone, enumOptions } from "@/lib/statusBadge";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, type TicketPriority, type TicketStatus } from "@/types/ticket.types";

// One option list per ticket enum, shared by the table filters, the new
// ticket form and the detail page's controls.
export const TICKET_STATUS_OPTIONS = enumOptions(TICKET_STATUSES);
export const TICKET_PRIORITY_OPTIONS = enumOptions(TICKET_PRIORITIES);
export const TICKET_CATEGORY_OPTIONS = enumOptions(TICKET_CATEGORIES);

// The board's chip colours for a ticket. Medium and low are quiet grey (low
// fainter), high orange, urgent red; open is blue, in progress amber,
// waiting on the user grey and solved mint.
export const TICKET_PRIORITY_TONE: Record<TicketPriority, BadgeTone> = { LOW: "neutral", MEDIUM: "neutral", HIGH: "orange", URGENT: "danger" };
export const TICKET_PRIORITY_CLASS: Partial<Record<TicketPriority, string>> = { LOW: "text-ink-muted", HIGH: "bg-orange-soft text-orange" };
export const TICKET_STATUS_TONE: Record<TicketStatus, BadgeTone> = { OPEN: "info", IN_PROGRESS: "warning", WAITING_ON_USER: "neutral", RESOLVED: "success", CLOSED: "neutral" };

// The dot before a status or priority in the ticket's settings card.
export const TICKET_STATUS_DOT: Record<TicketStatus, string> = {
  OPEN: "bg-info",
  IN_PROGRESS: "bg-warning-fill",
  WAITING_ON_USER: "bg-ink-faint",
  RESOLVED: "bg-emerald",
  CLOSED: "bg-ink-faint",
};
export const TICKET_PRIORITY_DOT: Record<TicketPriority, string> = { LOW: "bg-ink-faint", MEDIUM: "bg-ink-muted", HIGH: "bg-orange-fill", URGENT: "bg-expense-fill" };
