"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IItemsPageBody } from "@/types/api.types";
import type { IOwnerOverviewItem } from "@/types/owner.types";
import type {
  IAdminOption,
  ICreatedTicket,
  ICreateTicketPayload,
  ISavedReply,
  ISavedReplyPayload,
  ISupportTicket,
  ISupportTicketDetail,
  ITicketMessage,
  ITicketReplyPayload,
  ITicketStats,
  IUpdateTicketPayload,
  IUserSearchResult,
} from "@/types/ticket.types";

export const getTickets = async (queryString: string) => httpClient.getPaginated<ISupportTicket>(`/admin/tickets?${queryString}`);

export const getTicketStats = async () => httpClient.get<ITicketStats>("/admin/tickets/stats");

export const getTicketById = async (id: string) => httpClient.get<ISupportTicketDetail>(`/admin/tickets/${id}`);

export const createTicket = async (payload: ICreateTicketPayload) => httpClient.post<ICreatedTicket>("/admin/tickets", payload);

export const updateTicket = async (id: string, payload: IUpdateTicketPayload) => httpClient.patch<void>(`/admin/tickets/${id}`, payload);

// A reply, or a note for admins (isInternal), and the status to set after.
export const addTicketMessage = async (id: string, payload: ITicketReplyPayload) =>
  httpClient.post<ITicketMessage>(`/admin/tickets/${id}/messages`, payload);

// A reply with a picture: the same fields, multipart, the picture in `file`.
// The multipart type keeps axios from turning the form into JSON; it adds
// the boundary itself.
export const addTicketMessageWithPicture = async (id: string, form: FormData) =>
  httpClient.post<ITicketMessage>(`/admin/tickets/${id}/messages`, form, { headers: { "Content-Type": "multipart/form-data" } });

export const getSavedReplies = async () => httpClient.get<ISavedReply[]>("/admin/tickets/saved-replies");

export const createSavedReply = async (payload: ISavedReplyPayload) => httpClient.post<ISavedReply>("/admin/tickets/saved-replies", payload);

export const updateSavedReply = async (id: string, payload: ISavedReplyPayload) => httpClient.patch<ISavedReply>(`/admin/tickets/saved-replies/${id}`, payload);

export const deleteSavedReply = async (id: string) => httpClient.delete<{ success: boolean }>(`/admin/tickets/saved-replies/${id}`);

// null unassigns.
export const assignTicket = async (id: string, adminId: string | null) =>
  httpClient.patch<void>(`/admin/tickets/${id}/assign`, { adminId });

// /admin/admins itself is SUPER_ADMIN only; this dropdown endpoint stays
// open to every admin so support staff can assign tickets.
export const getAssignableAdmins = async () => httpClient.get<IAdminOption[]>("/admin/admins/assignable");

// Customers, for the "new ticket" picker -- the same list as Manage Owners.
// It used to search the legacy PlatformUser table, which nothing fills, so
// no real customer could be found.
export const searchCustomers = async (search: string) => {
  const params = new URLSearchParams({ search, page: "1", limit: "10" });
  const { data: body } = await httpClient.get<IItemsPageBody<IOwnerOverviewItem>>(`/admin/owners?${params.toString()}`);
  return {
    success: true as const,
    message: "",
    data: body.items.map(({ userId, name, email }): IUserSearchResult => ({ id: userId, name, email })),
  };
};
