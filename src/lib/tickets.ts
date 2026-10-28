import type { ISupportTicket, TicketStatus } from "@/types/ticket.types";
import { formatCount } from "./i18n/digits";
import { inEnglish, type Translate } from "./i18n/message";
import type { Locale } from "./i18n/translate";

// How a ticket's status reads: where it is in the conversation.
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_ON_USER: "Waiting on user",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

// Tickets still in the queue, in the order the tabs show them.
export const OPEN_TICKET_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_ON_USER"];

// The inbox's tabs as the board names them: everything still in the queue
// first (the API's IN_QUEUE), each step of it, then what is done, resolved
// or closed (DONE) -- which the tab says, as it holds both.
export const TICKET_TABS: { value: string; label: string; statuses: TicketStatus[] }[] = [
  { value: "IN_QUEUE", label: "All open", statuses: OPEN_TICKET_STATUSES },
  { value: "OPEN", label: "Need a reply", statuses: ["OPEN"] },
  { value: "IN_PROGRESS", label: "In progress", statuses: ["IN_PROGRESS"] },
  { value: "WAITING_ON_USER", label: "Waiting on user", statuses: ["WAITING_ON_USER"] },
  { value: "DONE", label: "Resolved or closed", statuses: ["RESOLVED", "CLOSED"] },
];

// How many tickets the given statuses hold, from the stats' count per status.
export const ticketCount = (statusCounts: Partial<Record<TicketStatus, number>>, statuses: TicketStatus[]) =>
  statuses.reduce((sum, status) => sum + (statusCounts[status] ?? 0), 0);

// How many tickets are still in the queue.
export const openTicketCount = (statusCounts: Partial<Record<TicketStatus, number>>) => ticketCount(statusCounts, OPEN_TICKET_STATUSES);

// "#3F2A1": the first part of the id, which is what people quote.
// "#482" from the ticket's number; an id alone (or an older response
// without the number) falls back to the id's first characters, "#58E90".
export const shortTicketId = (ticket: string | { id: string; number?: number | null }) =>
  typeof ticket !== "string" && ticket.number ? `#${ticket.number}` : `#${(typeof ticket === "string" ? ticket : ticket.id).slice(0, 5).toUpperCase()}`;

// The user wrote last and nobody has answered yet.
export const awaitingReply = (ticket: Pick<ISupportTicket, "status" | "lastMessageFrom">) =>
  ticket.lastMessageFrom === "USER" && OPEN_TICKET_STATUSES.includes(ticket.status);

// Waiting on an answer for more than a day.
export const WAIT_GOAL_MS = 24 * 60 * 60 * 1000;

export const isLate = (ticket: Pick<ISupportTicket, "status" | "lastMessageFrom" | "lastMessageAt">, now: Date = new Date()) =>
  awaitingReply(ticket) && ticket.lastMessageAt !== null && now.getTime() - new Date(ticket.lastMessageAt).getTime() > WAIT_GOAL_MS;

// "3h 20m", "45m", "2d 4h": an average first-reply time, its figures in the
// reader's digits when `locale` is given ("৩ ঘ ২০ মি").
export const hoursText = (hours: number, t: Translate = inEnglish, locale: Locale = "en") => {
  if (hours <= 0) return "—";
  const minutes = Math.round(hours * 60);
  const count = (value: number) => formatCount(value, locale);
  if (minutes < 60) return t("{m}m", { m: count(minutes) });
  if (minutes < 48 * 60) return t("{h}h {m}m", { h: count(Math.floor(minutes / 60)), m: count(minutes % 60) });
  return t("{d}d {h}h", { d: count(Math.floor(minutes / 1440)), h: count(Math.floor((minutes % 1440) / 60)) });
};

// "3, all solved", "2, 1 still open", "None before this one", the counts in
// the reader's digits when `locale` is given.
export const earlierTicketsText = (history: { total: number; solved: number }, t: Translate = inEnglish, locale: Locale = "en") => {
  if (history.total === 0) return t("None before this one");
  const total = formatCount(history.total, locale);
  if (history.solved === history.total) return t("{total}, all solved", { total });
  return t("{total}, {open} still open", { total, open: formatCount(history.total - history.solved, locale) });
};
