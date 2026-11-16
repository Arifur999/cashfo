"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type Book, type BookNote, type BookNoteKind, type BookShelf, type BookStatus, type BookWithSummary, type NoteMark, type ReadingDayRange } from "./api";
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

export interface BookInput {
  title: string;
  author?: string;
  totalPages: number;
  pagesRead?: number;
  status?: BookStatus;
  color?: string;
  // Put a book being read down for now, or take it up again.
  paused?: boolean;
  // Taka; null clears it.
  price?: number | null;
  // A built-in shelf key or the id of one of the reader's own shelves.
  shelf?: string;
  // The summary of the whole book; '' clears it.
  summary?: string;
}

export async function createBookAction(input: BookInput): Promise<ActionResult<Book>> {
  return callApi(async () => {
    const res = await customerApi.post<Book>(`${API_BASE_URL}/api/books`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save book");
}

// The same route edits the details, records progress (pagesRead) and moves a
// book between shelves (status).
export async function updateBookAction(id: string, input: Partial<BookInput>): Promise<ActionResult<BookWithSummary>> {
  return callApi(async () => {
    const res = await customerApi.patch<BookWithSummary>(`${API_BASE_URL}/api/books/${id}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save book");
}

export async function deleteBookAction(id: string): Promise<ActionResult<{ id: string }>> {
  return callApi(async () => {
    const res = await customerApi.delete<{ id: string }>(`${API_BASE_URL}/api/books/${id}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove book");
}

export interface BookNoteInput {
  page: number;
  date: string; // YYYY-MM-DD
  kind: BookNoteKind;
  line: string;
  text: string;
  // Highlights, when a deleted note is put back.
  marks?: NoteMark[];
}

// Reading now's "Log today's reading": read up to `toPage` on `date`.
export async function logReadingAction(bookId: string, input: { date: string; toPage: number; finish: boolean }): Promise<ActionResult<{ book: Book; day: ReadingDayRange }>> {
  return callApi(async () => {
    const res = await customerApi.post<{ book: Book; day: ReadingDayRange }>(`${API_BASE_URL}/api/books/${bookId}/reading`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the reading");
}

export async function createBookShelfAction(name: string): Promise<ActionResult<BookShelf>> {
  return callApi(async () => {
    const res = await customerApi.post<BookShelf>(`${API_BASE_URL}/api/books/shelves`, { name }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to make the shelf");
}

// An edit of a note, or of its highlights alone (`marks`).
export async function updateBookNoteAction(bookId: string, noteId: string, input: Partial<BookNoteInput>): Promise<ActionResult<BookNote>> {
  return callApi(async () => {
    const res = await customerApi.patch<BookNote>(`${API_BASE_URL}/api/books/${bookId}/notes/${noteId}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the note");
}

export async function addBookNoteAction(bookId: string, input: BookNoteInput): Promise<ActionResult<BookNote>> {
  return callApi(async () => {
    const res = await customerApi.post<BookNote>(`${API_BASE_URL}/api/books/${bookId}/notes`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the note");
}

export async function removeBookNoteAction(bookId: string, noteId: string): Promise<ActionResult<{ id: string }>> {
  return callApi(async () => {
    const res = await customerApi.delete<{ id: string }>(`${API_BASE_URL}/api/books/${bookId}/notes/${noteId}`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to remove the note");
}

export async function setBookGoalAction(target: number): Promise<ActionResult<{ year: number; goalTarget: number | null }>> {
  return callApi(async () => {
    const res = await customerApi.put<{ year: number; goalTarget: number | null }>(`${API_BASE_URL}/api/books/goal`, { target }, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save goal");
}

export async function clearBookGoalAction(): Promise<ActionResult<{ year: number; goalTarget: number | null }>> {
  return callApi(async () => {
    const res = await customerApi.delete<{ year: number; goalTarget: number | null }>(`${API_BASE_URL}/api/books/goal`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save goal");
}
