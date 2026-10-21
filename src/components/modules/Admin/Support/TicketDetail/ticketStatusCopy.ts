import type { TicketStatus } from "@/types/ticket.types";

// Taking a ticket out of the queue is the one change worth a second look,
// whether it is made in the settings card or after sending a reply.
export const CLOSING_STATUSES: Partial<Record<TicketStatus, { title: string; description: string; confirmLabel: string }>> = {
  RESOLVED: {
    title: "Mark as resolved?",
    description: "The ticket leaves the open queue and its resolution time is recorded.",
    confirmLabel: "Mark resolved",
  },
  CLOSED: {
    title: "Close this ticket?",
    description: "The ticket leaves the queue. It can be reopened later by changing its status.",
    confirmLabel: "Close ticket",
  },
};

// The same moves made from the reply box, where confirming also sends the
// reply and cancelling sends nothing, so the copy says both.
export const SEND_AND_CLOSE_STATUSES: Partial<Record<TicketStatus, { title: string; description: string; confirmLabel: string }>> = {
  RESOLVED: {
    title: "Send and mark as resolved?",
    description: "Your reply goes to {name}, then the ticket leaves the open queue and its resolution time is recorded.",
    confirmLabel: "Send and resolve",
  },
  CLOSED: {
    title: "Send and close this ticket?",
    description: "Your reply goes to {name}, then the ticket leaves the queue. It can be reopened later by changing its status.",
    confirmLabel: "Send and close",
  },
};
