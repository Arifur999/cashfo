// Server-only helpers, same shape as lib/books.ts -- User-scoped (no
// :businessId at all, see api.ts's own comment on Habit).
import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type TodoList } from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  return { Authorization: `Bearer ${accessToken}` };
}

export const getTodoLists = cache(async (): Promise<TodoList[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await axios.get<TodoList[]>(`${API_BASE_URL}/api/todos`, { headers });
    return res.data;
  } catch {
    return [];
  }
});

export const getTodoList = cache(async (id: string): Promise<TodoList | null> => {
  const headers = await authHeaders();
  if (!headers) return null;
  try {
    const res = await axios.get<TodoList>(`${API_BASE_URL}/api/todos/${id}`, { headers });
    return res.data;
  } catch {
    return null;
  }
});
