import type { AdminRole } from "./auth.types";

export const TICKET_CATEGORIES = ["BILLING", "TECHNICAL", "ACCOUNT", "FEATURE_REQUEST", "BUG_REPORT", "OTHER"] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_ON_USER", "RESOLVED", "CLOSED"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export type SenderType = "ADMIN" | "USER";

export interface ITicketMessage {
  id: string;
  ticketId: string;
  senderType: SenderType;
  senderId: string;
  message: string;
  attachmentUrl: string | null;
  createdAt: string;
}

export interface ITicketUser {
  id: string;
  name: string;
  email: string;
}

export interface ISupportTicket {
  id: string;
  platformUserId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedToAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  platformUser: ITicketUser | null;
  assignedAdmin: { id: string; name: string } | null;
}

export interface ISupportTicketDetail extends Omit<ISupportTicket, "platformUser"> {
  messages: ITicketMessage[];
  platformUser: (ITicketUser & { plan: { id: string; name: string } | null }) | null;
}

// POST /admin/tickets answers with the bare ticket and its first message --
// no user or assignee attached.
export type ICreatedTicket = Omit<ISupportTicketDetail, "platformUser" | "assignedAdmin">;

export interface ITicketStats {
  openCount: number;
  inProgressCount: number;
  urgentCount: number;
  avgResolutionHours: number;
  byCategory: { category: TicketCategory; count: number }[];
  byPriority: { priority: TicketPriority; count: number }[];
}

// Admins a ticket can be assigned to (the dropdown-only endpoint every
// support role may read).
export interface IAdminOption {
  id: string;
  name: string;
  role: AdminRole;
}

export interface IUserSearchResult {
  id: string;
  name: string;
  email: string;
}

export interface ICreateTicketPayload {
  platformUserId: string;
  subject: string;
  category: TicketCategory;
  priority?: TicketPriority;
  initialMessage: string;
}

export interface IUpdateTicketPayload {
  status?: TicketStatus;
  priority?: TicketPriority;
}
