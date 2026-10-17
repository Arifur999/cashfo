import type { ISupportTicket, TicketStatus } from "@/types/ticket.types";

// How a ticket's status reads: where it is in the conversation.
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_ON_USER: "Waiting on user",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

// The status tabs say what the queue needs from an admin.
export const TICKET_TAB_LABEL: Record<TicketStatus, string> = {
  ...TICKET_STATUS_LABEL,
  OPEN: "Need a reply",
};

// Tickets still in the queue, in the order the tabs show them.
export const OPEN_TICKET_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_ON_USER"];

// "#3F2A1": the first part of the id, which is what people quote.
export const shortTicketId = (id: string) => `#${id.slice(0, 5).toUpperCase()}`;

// The user wrote last and nobody has answered yet.
export const awaitingReply = (ticket: Pick<ISupportTicket, "status" | "lastMessageFrom">) =>
  ticket.lastMessageFrom === "USER" && OPEN_TICKET_STATUSES.includes(ticket.status);

// Waiting on an answer for more than a day.
export const WAIT_GOAL_MS = 24 * 60 * 60 * 1000;

export const isLate = (ticket: Pick<ISupportTicket, "status" | "lastMessageFrom" | "lastMessageAt">, now: Date = new Date()) =>
  awaitingReply(ticket) && ticket.lastMessageAt !== null && now.getTime() - new Date(ticket.lastMessageAt).getTime() > WAIT_GOAL_MS;

// "3h 20m", "45m", "2d 4h": an average first-reply time.
export const hoursText = (hours: number) => {
  if (hours <= 0) return "—";
  const minutes = Math.round(hours * 60);
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 48 * 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
};

// "3, all solved", "2, 1 still open", "None before this one".
export const earlierTicketsText = (history: { total: number; solved: number }) => {
  if (history.total === 0) return "None before this one";
  if (history.solved === history.total) return `${history.total}, all solved`;
  const open = history.total - history.solved;
  return `${history.total}, ${open} still open`;
};
