// Server-only reads (not "use server" -- only ever imported by Server
// Components, same reasoning as adminAuth.ts / payments.ts).

import axios from "axios";
import {
  API_BASE_URL,
  type AdminOption,
  type FeatureRequestRow,
  type ListTicketsResponse,
  type SupportTicketDetail,
  type TicketStats,
} from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getTickets(queryString: string): Promise<ListTicketsResponse> {
  const response = await axios.get<ListTicketsResponse>(`${API_BASE_URL}/admin/tickets?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getTicketById(id: string): Promise<SupportTicketDetail | null> {
  try {
    const response = await axios.get<SupportTicketDetail>(`${API_BASE_URL}/admin/tickets/${id}`, {
      headers: await authHeaders(),
    });
    return response.data;
  } catch {
    return null;
  }
}

export async function getTicketStats(): Promise<TicketStats> {
  const response = await axios.get<TicketStats>(`${API_BASE_URL}/admin/tickets/stats`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getAdminOptions(): Promise<AdminOption[]> {
  const response = await axios.get<AdminOption[]>(`${API_BASE_URL}/admin/admins`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getFeatureRequests(queryString: string): Promise<FeatureRequestRow[]> {
  const response = await axios.get<FeatureRequestRow[]>(`${API_BASE_URL}/admin/feature-requests?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}
