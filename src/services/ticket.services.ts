"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IItemsPageBody } from "@/types/api.types";
import type { IOwnerOverviewItem } from "@/types/owner.types";
import type {
  IAdminOption,
  ICreatedTicket,
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

export const createTicket = async (payload: ICreateTicketPayload) => httpClient.post<ICreatedTicket>("/admin/tickets", payload);

export const updateTicket = async (id: string, payload: IUpdateTicketPayload) => httpClient.patch<void>(`/admin/tickets/${id}`, payload);

export const addTicketMessage = async (id: string, message: string) =>
  httpClient.post<ITicketMessage>(`/admin/tickets/${id}/messages`, { message });

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
