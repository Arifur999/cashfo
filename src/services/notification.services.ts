"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type {
  ICampaign,
  ICampaignTargetFilter,
  ICreateCampaignPayload,
  INotificationLog,
  INotificationLogStats,
  INotificationTemplate,
  IUpdateNotificationTemplatePayload,
} from "@/types/notification.types";

const BASE = "/admin/notifications";

export const getNotificationLogStats = async () => httpClient.get<INotificationLogStats>(`${BASE}/logs/stats`);

// How many people a target filter reaches right now.
export const getCampaignAudience = async (filter: ICampaignTargetFilter) => {
  const params = new URLSearchParams();
  if (filter.planId) params.set("planId", filter.planId);
  if (filter.status) params.set("status", filter.status);
  return httpClient.get<{ count: number }>(`${BASE}/campaigns/audience?${params.toString()}`);
};

// Sorted by key.
export const getNotificationTemplates = async () => httpClient.get<INotificationTemplate[]>(`${BASE}/templates`);

export const updateNotificationTemplate = async (id: string, payload: IUpdateNotificationTemplatePayload) =>
  httpClient.patch<INotificationTemplate>(`${BASE}/templates/${id}`, payload);

export const getNotificationLogs = async (queryString: string) => httpClient.getPaginated<INotificationLog>(`${BASE}/logs?${queryString}`);

// Newest first.
export const getCampaigns = async () => httpClient.get<ICampaign[]>(`${BASE}/campaigns`);

export const createCampaign = async (payload: ICreateCampaignPayload) => httpClient.post<ICampaign>(`${BASE}/campaigns`, payload);

export const cancelCampaign = async (id: string) => httpClient.patch<ICampaign>(`${BASE}/campaigns/${id}/cancel`);
