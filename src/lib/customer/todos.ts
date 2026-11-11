// Server-only helpers, same shape as lib/books.ts -- User-scoped (no
// :businessId at all, see api.ts's own comment on Habit).
import { cache } from "react";
import { API_BASE_URL, type TodoCategory, type TodoList, type TodoRepeat } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";

async function authHeaders() {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  return { Authorization: `Bearer ${accessToken}` };
}

export const getTodoLists = cache(async (): Promise<TodoList[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<TodoList[]>(`${API_BASE_URL}/api/todos`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

export const getTodoRepeats = cache(async (): Promise<TodoRepeat[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<TodoRepeat[]>(`${API_BASE_URL}/api/todos/repeats`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

// The lists a task is filed under (Personal, Work, Home, Deen, the
// person's own); the built-in four are made on the first read.
export const getTodoCategories = cache(async (): Promise<TodoCategory[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<TodoCategory[]>(`${API_BASE_URL}/api/todos/categories`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

export const getTodoList = cache(async (id: string): Promise<TodoList | null> => {
  const headers = await authHeaders();
  if (!headers) return null;
  try {
    const res = await customerApi.get<TodoList>(`${API_BASE_URL}/api/todos/${id}`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});
