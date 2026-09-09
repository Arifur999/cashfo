// Server-only reads (not "use server" -- only ever imported by Server
// Components, same reasoning as adminAuth.ts / payments.ts).

import axios from "axios";
import {
  API_BASE_URL,
  type BulkNotificationCampaignRow,
  type ListNotificationLogsResponse,
  type NotificationTemplateRow,
} from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getNotificationTemplates(): Promise<NotificationTemplateRow[]> {
  const response = await axios.get<NotificationTemplateRow[]>(`${API_BASE_URL}/admin/notifications/templates`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getNotificationLogs(queryString: string): Promise<ListNotificationLogsResponse> {
  const response = await axios.get<ListNotificationLogsResponse>(`${API_BASE_URL}/admin/notifications/logs?${queryString}`, {
    headers: await authHeaders(),
  });
  return response.data;
}

export async function getNotificationCampaigns(): Promise<BulkNotificationCampaignRow[]> {
  const response = await axios.get<BulkNotificationCampaignRow[]>(`${API_BASE_URL}/admin/notifications/campaigns`, {
    headers: await authHeaders(),
  });
  return response.data;
}
