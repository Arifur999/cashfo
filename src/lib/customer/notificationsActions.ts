"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type NotificationFeed, type ReminderPreferences } from "./api";
import { getAccessToken, getAllWorkspaceUnlocks } from "@/lib/tokenUtils";
import { customerApi } from "./apiClient";

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

// Read by the bell after the shell mounts: the reminder checks behind it
// may take a moment, and no page should wait for them. The unlocks of the
// PIN-locked workspaces opened here go along: the others' reminders come
// back without their details.
export async function getNotificationsAction(): Promise<ActionResult<NotificationFeed>> {
  return callApi(async () => {
    const unlocks = await getAllWorkspaceUnlocks();
    const headers = { ...(await authHeaders()), ...(unlocks && { "x-workspace-unlock": unlocks }) };
    return (await customerApi.get<NotificationFeed>(`${API_BASE_URL}/api/notifications`, { headers })).data;
  }, "Failed to load notifications");
}

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.post(`${API_BASE_URL}/api/notifications/${encodeURIComponent(id)}/read`, {}, { headers: await authHeaders() });
  }, "Failed to mark the notification as read");
}

// The bell's Delete (it waits 30 days in Deleted) and Restore.
export async function deleteNotificationAction(id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.post(`${API_BASE_URL}/api/notifications/${encodeURIComponent(id)}/delete`, {}, { headers: await authHeaders() });
  }, "Couldn't delete the notification");
}

export async function restoreNotificationAction(id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.post(`${API_BASE_URL}/api/notifications/${encodeURIComponent(id)}/restore`, {}, { headers: await authHeaders() });
  }, "Couldn't restore the notification");
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.post(`${API_BASE_URL}/api/notifications/read-all`, {}, { headers: await authHeaders() });
  }, "Failed to mark the notifications as read");
}

export async function getReminderPreferencesAction(): Promise<ActionResult<ReminderPreferences>> {
  return callApi(async () => (await customerApi.get<ReminderPreferences>(`${API_BASE_URL}/api/notifications/preferences`, { headers: await authHeaders() })).data, "Failed to load reminders");
}

// Only the switches go back: the read answer also carries emailReady, which
// the API's whitelist would refuse.
export async function saveReminderPreferencesAction(preferences: ReminderPreferences): Promise<ActionResult<ReminderPreferences>> {
  const { budget, loans, savings, monthlySummaryEmail } = preferences;
  const body = { budget, loans, savings, ...(monthlySummaryEmail !== undefined && { monthlySummaryEmail }) };
  return callApi(async () => (await customerApi.put<ReminderPreferences>(`${API_BASE_URL}/api/notifications/preferences`, body, { headers: await authHeaders() })).data, "Failed to save reminders");
}
