"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type {
  ICampaign,
  ICampaignAudience,
  ICampaignTargetFilter,
  ICreateNotificationTemplatePayload,
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
  if (filter.lastActiveWithinDays) params.set("lastActiveWithinDays", String(filter.lastActiveWithinDays));
  if (filter.language) params.set("language", filter.language);
  return httpClient.get<ICampaignAudience>(`${BASE}/campaigns/audience?${params.toString()}`);
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

// "Send now": answers once the send is done, or still SENDING with the
// counts so far. Email answers 503 while no provider is set up; SMS always
// does (none yet).
export const sendCampaign = async (id: string) => httpClient.post<ICampaign>(`${BASE}/campaigns/${id}/send`);

export const createNotificationTemplate = async (payload: ICreateNotificationTemplatePayload) => httpClient.post<INotificationTemplate>(`${BASE}/templates`, payload);

// "Send a test to me": the template filled in for the admin, emailed to them.
export const sendNotificationTemplateTest = async (id: string, language: "EN" | "BN") =>
  httpClient.post<{ sentTo: string }>(`${BASE}/templates/${encodeURIComponent(id)}/test`, { language });

// A template made in the panel (not a built-in one, nor one a campaign still has to send).
export const deleteNotificationTemplate = async (id: string) => httpClient.delete<{ id: string }>(`${BASE}/templates/${encodeURIComponent(id)}`);

// A campaign that never sent: a draft, a scheduled one or a cancelled one.
export const deleteCampaign = async (id: string) => httpClient.delete<{ id: string }>(`${BASE}/campaigns/${encodeURIComponent(id)}`);
