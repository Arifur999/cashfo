"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type TodoList } from "./api";
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

// date: "YYYY-MM-DD"
export async function createTodoListAction(date: string): Promise<ActionResult<TodoList>> {
  return callApi(async () => {
    const res = await axios.post<TodoList>(`${API_BASE_URL}/api/todos`, { date }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create list");
}

export async function deleteTodoListAction(id: string): Promise<ActionResult<{ id: string }>> {
  return callApi(async () => {
    const res = await axios.delete<{ id: string }>(`${API_BASE_URL}/api/todos/${id}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove list");
}

export async function addTodoItemAction(listId: string, text: string): Promise<ActionResult<TodoList>> {
  return callApi(async () => {
    const res = await axios.post<TodoList>(`${API_BASE_URL}/api/todos/${listId}/items`, { text }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to add task");
}

export async function updateTodoItemAction(listId: string, itemId: string, input: { text?: string; completed?: boolean }): Promise<ActionResult<TodoList>> {
  return callApi(async () => {
    const res = await axios.patch<TodoList>(`${API_BASE_URL}/api/todos/${listId}/items/${itemId}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to update task");
}

export async function removeTodoItemAction(listId: string, itemId: string): Promise<ActionResult<TodoList>> {
  return callApi(async () => {
    const res = await axios.delete<TodoList>(`${API_BASE_URL}/api/todos/${listId}/items/${itemId}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove task");
}
