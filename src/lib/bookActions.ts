"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type Book, type BookStatus } from "./api";
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

export interface BookInput {
  title: string;
  author?: string;
  totalPages: number;
  pagesRead?: number;
  status?: BookStatus;
  color?: string;
}

export async function createBookAction(input: BookInput): Promise<ActionResult<Book>> {
  return callApi(async () => {
    const res = await axios.post<Book>(`${API_BASE_URL}/api/books`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save book");
}

// The same route edits the details, records progress (pagesRead) and moves a
// book between shelves (status).
export async function updateBookAction(id: string, input: Partial<BookInput>): Promise<ActionResult<Book>> {
  return callApi(async () => {
    const res = await axios.patch<Book>(`${API_BASE_URL}/api/books/${id}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save book");
}

export async function deleteBookAction(id: string): Promise<ActionResult<{ id: string }>> {
  return callApi(async () => {
    const res = await axios.delete<{ id: string }>(`${API_BASE_URL}/api/books/${id}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove book");
}

export async function setBookGoalAction(target: number): Promise<ActionResult<{ year: number; goalTarget: number | null }>> {
  return callApi(async () => {
    const res = await axios.put<{ year: number; goalTarget: number | null }>(`${API_BASE_URL}/api/books/goal`, { target }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save goal");
}

export async function clearBookGoalAction(): Promise<ActionResult<{ year: number; goalTarget: number | null }>> {
  return callApi(async () => {
    const res = await axios.delete<{ year: number; goalTarget: number | null }>(`${API_BASE_URL}/api/books/goal`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save goal");
}
