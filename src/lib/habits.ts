// Server-only helpers, same shape as lib/groupExpenses.ts -- except every
// endpoint here is User-scoped (no :businessId at all, see api.ts's own
// comment on Habit).
import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type Habit, type HabitMonthLogs, type HabitStat, type HabitToday } from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  return { Authorization: `Bearer ${accessToken}` };
}

export const getHabits = cache(async (includeArchived = false, category?: string): Promise<Habit[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await axios.get<Habit[]>(`${API_BASE_URL}/api/habits`, { headers, params: { includeArchived, category } });
    return res.data;
  } catch {
    return [];
  }
});

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

export const getHabitStats = cache(async (): Promise<HabitStat[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await axios.get<HabitStat[]>(`${API_BASE_URL}/api/habits/stats`, { headers });
    return res.data;
  } catch {
    return [];
  }
});

const EMPTY_MONTH_LOGS: HabitMonthLogs = { habits: [], logs: [] };

// month: "YYYY-MM"
export const getHabitMonthLogs = cache(async (month: string): Promise<HabitMonthLogs> => {
  const headers = await authHeaders();
  if (!headers) return EMPTY_MONTH_LOGS;
  try {
    const res = await axios.get<HabitMonthLogs>(`${API_BASE_URL}/api/habits/month`, { headers, params: { month } });
    return res.data;
  } catch {
    return EMPTY_MONTH_LOGS;
  }
});
