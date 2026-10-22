"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type TodoList, type TodoPriority, type TodoRepeatKind } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { getAppToday } from "@/lib/date";
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

// Today's list, or null if none has been created yet -- for the TopBar's
// quick-access button (TodayTasksButton), which is a Client Component and so
// can't call lib/todos.ts's server-only getTodoLists() directly.
export async function getTodayTodoListAction(): Promise<ActionResult<TodoList | null>> {
  return callApi(async () => {
    const res = await customerApi.get<TodoList[]>(`${API_BASE_URL}/api/todos`, { headers: await authHeaders() });
    const todayKey = getAppToday();
    return res.data.find((list) => list.date === todayKey) ?? null;
  }, "Failed to load today's tasks");
}

// date: "YYYY-MM-DD"
export async function createTodoListAction(date: string): Promise<ActionResult<TodoList>> {
  return callApi(async () => {
    const res = await customerApi.post<TodoList>(`${API_BASE_URL}/api/todos`, { date }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create list");
}

export async function deleteTodoListAction(id: string): Promise<ActionResult<{ id: string }>> {
  return callApi(async () => {
    const res = await customerApi.delete<{ id: string }>(`${API_BASE_URL}/api/todos/${id}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove list");
}

export interface NewTodoItem {
  text: string;
  priority?: TodoPriority;
  dueTime?: string | null;
  // Minutes before dueTime to be reminded (0 = at the time, at most 120);
  // null = no reminder.
  remindBefore?: number | null;
}

export async function addTodoItemAction(listId: string, item: NewTodoItem): Promise<ActionResult<TodoList>> {
  return callApi(async () => {
    const res = await customerApi.post<TodoList>(`${API_BASE_URL}/api/todos/${listId}/items`, item, { headers: await authHeaders() });
    return res.data;
  }, "Failed to add task");
}

// What the Edit task drawer (or a tick) changes. date moves the task to
// that day; repeat null stops it repeating.
export interface TodoItemChanges {
  text?: string;
  completed?: boolean;
  priority?: TodoPriority;
  dueTime?: string | null;
  // Minutes before dueTime to be reminded (0 = at the time, at most 120);
  // null = no reminder.
  remindBefore?: number | null;
  date?: string;
  // A repeat's copies remind as the task does unless remindBefore says otherwise.
  repeat?: { kind: TodoRepeatKind; weekdays?: number[]; remindBefore?: number | null } | null;
}

export async function updateTodoItemAction(listId: string, itemId: string, input: TodoItemChanges): Promise<ActionResult<TodoList>> {
  return callApi(async () => {
    const res = await customerApi.patch<TodoList>(`${API_BASE_URL}/api/todos/${listId}/items/${itemId}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to update task");
}

export async function removeTodoItemAction(listId: string, itemId: string): Promise<ActionResult<TodoList>> {
  return callApi(async () => {
    const res = await customerApi.delete<TodoList>(`${API_BASE_URL}/api/todos/${listId}/items/${itemId}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove task");
}

// Pushes an unfinished task to a list dated one day after THIS list (not
// necessarily the real calendar tomorrow -- pushing from an old list moves it
// to the day right after that one), auto-creating that list if needed.
// Returns the SOURCE list's updated view (the item is now gone from it).
export async function moveTodoItemToNextDayAction(listId: string, itemId: string): Promise<ActionResult<TodoList>> {
  return callApi(async () => {
    const res = await customerApi.post<TodoList>(`${API_BASE_URL}/api/todos/${listId}/items/${itemId}/move-to-next-day`, {}, { headers: await authHeaders() });
    return res.data;
  }, "Failed to move task");
}
