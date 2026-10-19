"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type Habit, type HabitFrequency, type HabitLog, type HabitMonthTracker, type PrayerStatus, type QazaSummary } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
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

export async function deleteHabitAction(id: string): Promise<ActionResult<{ id: string; action: "deleted" | "archived" }>> {
  return callApi(async () => {
    const res = await customerApi.delete<{ id: string; action: "deleted" | "archived" }>(`${API_BASE_URL}/api/habits/${id}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove habit");
}

export async function checkInHabitAction(
  id: string,
  input: { date: string; completed?: boolean; value?: number; note?: string },
): Promise<ActionResult<HabitLog>> {
  return callApi(async () => {
    const res = await customerApi.post<HabitLog>(`${API_BASE_URL}/api/habits/${id}/check-in`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to check in");
}

export async function removeCheckInAction(id: string, date: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/habits/${id}/check-in`, { headers: await authHeaders(), params: { date } });
  }, "Failed to undo check-in");
}

// ---- Month trackers ("Create Month" sheets) ----

export async function createHabitTrackerAction(input: { category: string; month: number; year: number }): Promise<ActionResult<HabitMonthTracker>> {
  return callApi(async () => {
    const res = await customerApi.post<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create month tracker");
}

// status: how a Namaz prayer was prayed (left out, a new mark is on time).
export async function setHabitTrackerCheckAction(
  id: string,
  input: { day: number; item: string; checked: boolean; status?: PrayerStatus },
): Promise<ActionResult<{ day: number; item: string; checked: boolean }>> {
  return callApi(async () => {
    const res = await customerApi.put<{ day: number; item: string; checked: boolean }>(`${API_BASE_URL}/api/habit-trackers/${id}/check`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to update");
}

export async function deleteHabitTrackerAction(id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/habit-trackers/${id}`, { headers: await authHeaders() });
  }, "Failed to remove month tracker");
}

// ---- Ramadan sheets (a month tracker keyed by year, with editable habits) ----

export async function createRamadanTrackerAction(input: { year: number; days: 29 | 30 }): Promise<ActionResult<HabitMonthTracker>> {
  return callApi(async () => {
    const res = await customerApi.post<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/ramadan`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create Ramadan");
}

// ---- Others challenges (a named, day-count sheet -- any number can run at once) ----

export async function createCustomTrackerAction(input: { name: string; totalDays: number }): Promise<ActionResult<HabitMonthTracker>> {
  return callApi(async () => {
    const res = await customerApi.post<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/custom`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create challenge");
}

export async function addTrackerItemAction(id: string, name: string): Promise<ActionResult<HabitMonthTracker>> {
  return callApi(async () => {
    const res = await customerApi.post<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/${id}/items`, { name }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save habit");
}

export async function removeTrackerItemAction(id: string, name: string): Promise<ActionResult<HabitMonthTracker>> {
  return callApi(async () => {
    const res = await customerApi.delete<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/${id}/items`, { headers: await authHeaders(), params: { name } });
    return res.data;
  }, "Failed to remove habit");
}

// ---- Daily habits ----

export interface HabitInput {
  name: string;
  icon?: string;
  color?: string;
  frequencyType?: HabitFrequency;
  weeklyDays?: number[];
  weeklyCount?: number;
  targetValue?: number | null;
  unit?: string | null;
}

export async function createHabitAction(input: HabitInput): Promise<ActionResult<Habit>> {
  return callApi(async () => {
    const res = await customerApi.post<Habit>(`${API_BASE_URL}/api/habits`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to add the habit");
}

export async function updateHabitAction(id: string, input: Partial<HabitInput> & { isArchived?: boolean }): Promise<ActionResult<Habit>> {
  return callApi(async () => {
    const res = await customerApi.patch<Habit>(`${API_BASE_URL}/api/habits/${id}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to update the habit");
}

// Qaza: the prayers still owed and the ones made up.
export async function logQazaAction(prayer: string, count = 1): Promise<ActionResult<QazaSummary>> {
  return callApi(async () => {
    const res = await customerApi.post<QazaSummary>(`${API_BASE_URL}/api/namaz/qaza`, { prayer, count }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the qaza");
}

export async function removeQazaAction(id: string): Promise<ActionResult<QazaSummary>> {
  return callApi(async () => {
    const res = await customerApi.delete<QazaSummary>(`${API_BASE_URL}/api/namaz/qaza/${id}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove the qaza");
}

// since: "YYYY-MM-DD", the day qaza counting starts from.
export async function setQazaSinceAction(since: string): Promise<ActionResult<QazaSummary>> {
  return callApi(async () => {
    const res = await customerApi.put<QazaSummary>(`${API_BASE_URL}/api/namaz/qaza/since`, { since }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to change the counting day");
}
