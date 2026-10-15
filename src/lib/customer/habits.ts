// Server-only helpers, same shape as lib/groupExpenses.ts -- except every
// endpoint here is User-scoped (no :businessId at all, see api.ts's own
// comment on Habit).
import { cache } from "react";
import { API_BASE_URL, type Habit, type HabitMonth, type HabitMonthTracker, type HabitStat, type HabitToday } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";

async function authHeaders() {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  return { Authorization: `Bearer ${accessToken}` };
}

export const getHabitTrackers = cache(async (category: string): Promise<HabitMonthTracker[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<HabitMonthTracker[]>(`${API_BASE_URL}/api/habit-trackers`, { headers, params: { category } });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

export const getHabitTracker = cache(async (id: string): Promise<HabitMonthTracker | null> => {
  const headers = await authHeaders();
  if (!headers) return null;
  try {
    const res = await customerApi.get<HabitMonthTracker>(`${API_BASE_URL}/api/habit-trackers/${id}`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});

// ---- Daily habits (/api/habits) ----


// The habits planned for today, each with today's log and its streak.
export const getHabitsToday = cache(async (): Promise<HabitToday[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<HabitToday[]>(`${API_BASE_URL}/api/habits/today`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

export const getHabits = cache(async (includeArchived = false): Promise<Habit[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<Habit[]>(`${API_BASE_URL}/api/habits`, { headers, params: { includeArchived: includeArchived ? "true" : undefined } });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

export const getHabitStats = cache(async (): Promise<HabitStat[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<HabitStat[]>(`${API_BASE_URL}/api/habits/stats`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

// Every habit and one month's logs ("YYYY-MM").
export const getHabitMonth = cache(async (month: string): Promise<HabitMonth> => {
  const headers = await authHeaders();
  if (!headers) return { habits: [], logs: [] };
  try {
    const res = await customerApi.get<HabitMonth>(`${API_BASE_URL}/api/habits/month`, { headers, params: { month } });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, { habits: [], logs: [] });
  }
});
