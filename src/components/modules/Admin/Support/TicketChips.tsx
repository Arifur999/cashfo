import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { TICKET_STATUS_LABEL } from "@/lib/tickets";
import type { TicketPriority, TicketStatus } from "@/types/ticket.types";
import { TICKET_PRIORITY_CLASS, TICKET_PRIORITY_TONE, TICKET_STATUS_TONE } from "./ticketOptions";

// A ticket's priority and status as the board's chips, in the queue and on
// the ticket's own page.
export const TicketPriorityChip = ({ priority }: { priority: TicketPriority }) => (
  <StatusBadgeCell status={priority} tone={TICKET_PRIORITY_TONE[priority]} className={TICKET_PRIORITY_CLASS[priority]} />
);

export const TicketStatusChip = ({ status }: { status: TicketStatus }) => (
  <StatusBadgeCell status={status} tone={TICKET_STATUS_TONE[status]} label={TICKET_STATUS_LABEL[status]} className="whitespace-nowrap" />
);
