"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage } from "@/lib/api";
import type { BulkNotificationCampaignRow, CampaignTargetFilter, NotificationChannel, NotificationTemplateRow } from "@/lib/api";
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

export interface UpdateTemplateInput {
  subjectEn?: string;
  subjectBn?: string;
  bodyEn?: string;
  bodyBn?: string;
  variables?: string[];
}

export async function updateTemplateAction(id: string, updates: UpdateTemplateInput): Promise<ActionResult<NotificationTemplateRow>> {
  return callApi(async () => {
    const response = await axios.patch<NotificationTemplateRow>(`${API_BASE_URL}/admin/notifications/templates/${id}`, updates, {
      headers: await authHeaders(),
    });
    return response.data;
  }, "Failed to update template");
}

export interface CreateCampaignInput {
  title: string;
  templateKey: string;
  targetFilter: CampaignTargetFilter;
  channel: NotificationChannel;
  scheduledFor?: string;
}

export async function createCampaignAction(input: CreateCampaignInput): Promise<ActionResult<BulkNotificationCampaignRow>> {
  return callApi(async () => {
    const response = await axios.post<BulkNotificationCampaignRow>(`${API_BASE_URL}/admin/notifications/campaigns`, input, {
      headers: await authHeaders(),
    });
    return response.data;
  }, "Failed to create campaign");
}

export async function sendCampaignAction(id: string): Promise<ActionResult<BulkNotificationCampaignRow>> {
  return callApi(async () => {
    const response = await axios.post<BulkNotificationCampaignRow>(
      `${API_BASE_URL}/admin/notifications/campaigns/${id}/send`,
      {},
      { headers: await authHeaders() },
    );
    return response.data;
  }, "Failed to send campaign");
}

export async function cancelCampaignAction(id: string): Promise<ActionResult<BulkNotificationCampaignRow>> {
  return callApi(async () => {
    const response = await axios.patch<BulkNotificationCampaignRow>(
      `${API_BASE_URL}/admin/notifications/campaigns/${id}/cancel`,
      {},
      { headers: await authHeaders() },
    );
    return response.data;
  }, "Failed to cancel campaign");
}
