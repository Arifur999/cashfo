"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type PushSubscriptionInput, type Reminder, type ReminderInput, type RemindersOverview } from "./api";
import { customerApi } from "./apiClient";

// Habit reminders and web push, from the browser: the reminder editor, the
// Settings › App card and the push hook. Each answers { success, message?,
// data? } and never throws; the message is the API's, else the English
// fallback, for the caller to translate.

export interface ActionResult<T = void> {
  success: boolean;
  message?: string;
  data?: T;
}

async function callApi<T>(fn: () => Promise<T>, fallbackMessage: string): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await fn() };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { success: false, message: getApiErrorMessage(error.response?.data, fallbackMessage) };
    }
    return { success: false, message: fallbackMessage };
  }
}

// Read again by the Settings card's "Try again".
export async function getRemindersAction(): Promise<ActionResult<RemindersOverview>> {
  return callApi(async () => (await customerApi.get<RemindersOverview>(`${API_BASE_URL}/api/reminders`)).data, "Couldn't load your reminders.");
}

// Creates or updates the one reminder for (kind, targetKey). Turning one off
// saves it with enabled: false, so its times are kept for next time.
export async function saveReminderAction(input: ReminderInput): Promise<ActionResult<Reminder>> {
  return callApi(async () => (await customerApi.put<Reminder>(`${API_BASE_URL}/api/reminders`, input)).data, "Failed to save the reminder");
}

export async function deleteReminderAction(id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/reminders/${encodeURIComponent(id)}`);
  }, "Failed to remove the reminder");
}

// The master switch for every habit-area reminder, in the bell and as push.
export async function saveRemindHabitsAction(remindHabits: boolean): Promise<ActionResult<{ remindHabits: boolean }>> {
  return callApi(async () => (await customerApi.put<{ remindHabits: boolean }>(`${API_BASE_URL}/api/reminders/settings`, { remindHabits })).data, "Failed to save reminders");
}

// This device's push address, saved (again) with the language its
// notifications should be written in.
export async function subscribePushAction(subscription: PushSubscriptionInput): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.post(`${API_BASE_URL}/api/push/subscriptions`, subscription);
  }, "Couldn't turn on notifications on this device");
}

export async function unsubscribePushAction(endpoint: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/push/subscriptions`, { data: { endpoint } });
  }, "Couldn't turn off notifications on this device");
}

// A test notification to every device this person turned on.
export async function sendTestPushAction(): Promise<ActionResult<{ sent: number }>> {
  return callApi(async () => (await customerApi.post<{ sent: number }>(`${API_BASE_URL}/api/push/test`, {})).data, "Couldn't send a test notification");
}
