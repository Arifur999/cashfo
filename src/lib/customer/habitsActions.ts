"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type HabitLog, type HabitMonthTracker } from "./api";
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

export async function setHabitTrackerCheckAction(
  id: string,
  input: { day: number; item: string; checked: boolean },
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
