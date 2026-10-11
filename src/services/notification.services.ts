"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type {
  ICampaign,
  ICreateCampaignPayload,
  INotificationLog,
  INotificationTemplate,
  IUpdateNotificationTemplatePayload,
} from "@/types/notification.types";

const BASE = "/admin/notifications";

// Sorted by key.
export const getNotificationTemplates = async () => httpClient.get<INotificationTemplate[]>(`${BASE}/templates`);

export const updateNotificationTemplate = async (id: string, payload: IUpdateNotificationTemplatePayload) =>
  httpClient.patch<INotificationTemplate>(`${BASE}/templates/${id}`, payload);

export const getNotificationLogs = async (queryString: string) => httpClient.getPaginated<INotificationLog>(`${BASE}/logs?${queryString}`);

// Newest first.
export const getCampaigns = async () => httpClient.get<ICampaign[]>(`${BASE}/campaigns`);

export const createCampaign = async (payload: ICreateCampaignPayload) => httpClient.post<ICampaign>(`${BASE}/campaigns`, payload);

export const cancelCampaign = async (id: string) => httpClient.patch<ICampaign>(`${BASE}/campaigns/${id}/cancel`);
