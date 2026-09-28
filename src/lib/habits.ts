// Server-only helpers, same shape as lib/groupExpenses.ts -- except every
// endpoint here is User-scoped (no :businessId at all, see api.ts's own
// comment on Habit).
import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type HabitMonthTracker, type HabitToday } from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  return { Authorization: `Bearer ${accessToken}` };
}

export const getHabitsToday = cache(async (): Promise<HabitToday[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await axios.get<HabitToday[]>(`${API_BASE_URL}/api/habits/today`, { headers });
    return res.data;
  } catch {
    return [];
  }
});

export const getHabitTrackers = cache(async (category: string): Promise<HabitMonthTracker[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await axios.get<HabitMonthTracker[]>(`${API_BASE_URL}/api/habit-trackers`, { headers, params: { category } });
    return res.data;
  } catch {
    return [];
  }
});

export const getHabitTracker = cache(async (id: string): Promise<HabitMonthTracker | null> => {
  const headers = await authHeaders();
  if (!headers) return null;
  try {
    const res = await axios.get<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/${id}`, { headers });
    return res.data;
  } catch {
    return null;
  }
});
