"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IPaginatedBody } from "@/types/api.types";
import type {
  IAdminOption,
  ICreateTicketPayload,
  ISupportTicket,
  ISupportTicketDetail,
  ITicketMessage,
  ITicketStats,
  IUpdateTicketPayload,
  IUserSearchResult,
} from "@/types/ticket.types";

export const getTickets = async (queryString: string) => httpClient.getPaginated<ISupportTicket>(`/admin/tickets?${queryString}`);

export const getTicketStats = async () => httpClient.get<ITicketStats>("/admin/tickets/stats");

export const getTicketById = async (id: string) => httpClient.get<ISupportTicketDetail>(`/admin/tickets/${id}`);

export const createTicket = async (payload: ICreateTicketPayload) => httpClient.post<ISupportTicketDetail>("/admin/tickets", payload);

export const updateTicket = async (id: string, payload: IUpdateTicketPayload) => httpClient.patch<void>(`/admin/tickets/${id}`, payload);

export const addTicketMessage = async (id: string, message: string) =>
  httpClient.post<ITicketMessage>(`/admin/tickets/${id}/messages`, { message });

// null unassigns.
export const assignTicket = async (id: string, adminId: string | null) =>
  httpClient.patch<void>(`/admin/tickets/${id}/assign`, { adminId });

// /admin/admins itself is SUPER_ADMIN only; this dropdown endpoint stays
// open to every admin so support staff can assign tickets.
export const getAssignableAdmins = async () => httpClient.get<IAdminOption[]>("/admin/admins/assignable");

// Platform users (the end-user read model tickets belong to), for the
// "new ticket" user picker.
export const searchPlatformUsers = async (search: string) => {
  const params = new URLSearchParams({ search, limit: "10" });
  const { data: body } = await httpClient.get<IPaginatedBody<IUserSearchResult>>(`/admin/users?${params.toString()}`);
  return {
    success: true as const,
    message: "",
    data: body.data.map(({ id, name, email }) => ({ id, name, email })),
  };
};
