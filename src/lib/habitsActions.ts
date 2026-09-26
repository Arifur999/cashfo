"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type Habit, type HabitFrequency, type HabitLog, type HabitMonthTracker } from "./api";
import { getAccessToken } from "./tokenCookies";

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

export interface HabitInput {
  name: string;
  category?: string;
  icon?: string;
  color?: string;
  frequencyType?: HabitFrequency;
  weeklyDays?: number[];
  weeklyCount?: number;
  targetValue?: number;
  unit?: string;
}

export async function createHabitAction(input: HabitInput): Promise<ActionResult<Habit>> {
  return callApi(async () => {
    const res = await axios.post<Habit>(`${API_BASE_URL}/api/habits`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to add habit");
}

export async function updateHabitAction(id: string, input: Partial<HabitInput> & { isArchived?: boolean }): Promise<ActionResult<Habit>> {
  return callApi(async () => {
    const res = await axios.patch<Habit>(`${API_BASE_URL}/api/habits/${id}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to update habit");
}

export async function deleteHabitAction(id: string): Promise<ActionResult<{ id: string; action: "deleted" | "archived" }>> {
  return callApi(async () => {
    const res = await axios.delete<{ id: string; action: "deleted" | "archived" }>(`${API_BASE_URL}/api/habits/${id}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove habit");
}

export async function checkInHabitAction(
  id: string,
  input: { date: string; completed?: boolean; value?: number; note?: string },
): Promise<ActionResult<HabitLog>> {
  return callApi(async () => {
    const res = await axios.post<HabitLog>(`${API_BASE_URL}/api/habits/${id}/check-in`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to check in");
}

export async function removeCheckInAction(id: string, date: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.delete(`${API_BASE_URL}/api/habits/${id}/check-in`, { headers: await authHeaders(), params: { date } });
  }, "Failed to undo check-in");
}

// ---- Month trackers ("Create Month" sheets) ----

export async function createHabitTrackerAction(input: { category: string; month: number; year: number }): Promise<ActionResult<HabitMonthTracker>> {
  return callApi(async () => {
    const res = await axios.post<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create month tracker");
}

export async function setHabitTrackerCheckAction(
  id: string,
  input: { day: number; item: string; checked: boolean },
): Promise<ActionResult<{ day: number; item: string; checked: boolean }>> {
  return callApi(async () => {
    const res = await axios.put<{ day: number; item: string; checked: boolean }>(`${API_BASE_URL}/api/habit-trackers/${id}/check`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to update");
}

export async function deleteHabitTrackerAction(id: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.delete(`${API_BASE_URL}/api/habit-trackers/${id}`, { headers: await authHeaders() });
  }, "Failed to remove month tracker");
}
