"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage } from "@/lib/api";
import type { ListPlatformUsersResponse, SupportTicketDetail, TicketCategory, TicketMessageRow, TicketPriority, TicketStatus, UserSearchResult } from "@/lib/api";
import { getAccessToken } from "@/lib/tokenCookies";

export interface ActionResult<T = void> {
  success: boolean;
  message?: string;
  data?: T;
}

async function authHeaders() {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${accessToken}` };
}

async function callApi<T>(fn: () => Promise<T>, fallbackMessage: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { success: false, message: getApiErrorMessage(error.response?.data, fallbackMessage) };
    }
    return { success: false, message: fallbackMessage };
  }
}

export interface CreateTicketInput {
  platformUserId: string;
  subject: string;
  category: TicketCategory;
  priority?: TicketPriority;
  initialMessage: string;
}

export async function createTicketAction(input: CreateTicketInput): Promise<ActionResult<SupportTicketDetail>> {
  return callApi(async () => {
    const response = await axios.post<SupportTicketDetail>(`${API_BASE_URL}/admin/tickets`, input, { headers: await authHeaders() });
    return response.data;
  }, "Failed to create ticket");
}

export async function updateTicketAction(
  id: string,
  updates: { status?: TicketStatus; priority?: TicketPriority; assignedToAdminId?: string | null },
): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/tickets/${id}`, updates, { headers: await authHeaders() });
  }, "Failed to update ticket");
}

export async function addTicketMessageAction(id: string, message: string): Promise<ActionResult<TicketMessageRow>> {
  return callApi(async () => {
    const response = await axios.post<TicketMessageRow>(
      `${API_BASE_URL}/admin/tickets/${id}/messages`,
      { message },
      { headers: await authHeaders() },
    );
    return response.data;
  }, "Failed to send reply");
}

export async function assignTicketAction(id: string, adminId: string | null): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/tickets/${id}/assign`, { adminId }, { headers: await authHeaders() });
  }, "Failed to assign ticket");
}

export async function searchUsersAction(search: string): Promise<ActionResult<UserSearchResult[]>> {
  return callApi(async () => {
    const params = new URLSearchParams({ search, limit: "10" });
    const response = await axios.get<ListPlatformUsersResponse>(`${API_BASE_URL}/admin/users?${params.toString()}`, {
      headers: await authHeaders(),
    });
    return response.data.data.map((u) => ({ id: u.id, name: u.name, email: u.email }));
  }, "Failed to search users");
}
