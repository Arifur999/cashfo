"use server";

import axios from "axios";
import { TOO_MANY_ATTEMPTS_MESSAGE } from "@/lib/actionError";
import { clearJournalUnlock, getAccessToken, getJournalUnlock, setJournalUnlock } from "@/lib/tokenUtils";
import { API_BASE_URL, getApiErrorMessage, type JournalEntry, type JournalKind, type JournalMonth, type Note, type NoteCategory, type NoteCategoryColor, type NoteColor, type NoteKind } from "./api";
import type { ActionResult } from "./authActions";
import { customerApi } from "./apiClient";
import { JOURNAL_UNLOCK_HEADER } from "./writingDisplay";

// A refusal's own reason and counts (a wrong PIN's tries left, a locked
// diary's wait), so the forms say exactly what happened.
export interface WritingResult<T = void> extends ActionResult<T> {
  reason?: string;
  triesLeft?: number;
  retryAfterSec?: number;
}

const numberOr = (value: unknown): number | undefined => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

async function headers(withUnlock = false): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");
  const unlock = withUnlock ? await getJournalUnlock() : undefined;
  return { Authorization: `Bearer ${accessToken}`, ...(unlock && { [JOURNAL_UNLOCK_HEADER]: unlock }) };
}

async function callApi<T>(fn: () => Promise<T>, fallbackMessage: string): Promise<WritingResult<T>> {
  try {
    return { success: true, data: await fn() };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = (error.response?.data ?? {}) as { reason?: unknown; triesLeft?: unknown; retryAfterSec?: unknown };
      const triesLeft = numberOr(body.triesLeft);
      const retryAfterSec = numberOr(body.retryAfterSec);
      const extra = {
        ...(typeof body.reason === "string" && { reason: body.reason }),
        ...(triesLeft !== undefined && { triesLeft }),
        ...(retryAfterSec !== undefined && { retryAfterSec }),
      };
      // The throttle's own 429 reads as a crash in its raw words.
      if (error.response?.status === 429 && !extra.reason) return { success: false, message: TOO_MANY_ATTEMPTS_MESSAGE, reason: "THROTTLED" };
      return { success: false, message: getApiErrorMessage(error.response?.data, fallbackMessage), ...extra };
    }
    return { success: false, message: fallbackMessage };
  }
}

// ---- Notes ----

export interface NoteInput {
  kind?: NoteKind;
  title?: string;
  body?: string;
  categoryId?: string | null;
  tags?: string[];
  color?: NoteColor;
  pinned?: boolean;
  archived?: boolean;
}

export async function createNoteAction(input: NoteInput & { body: string }): Promise<WritingResult<Note>> {
  return callApi(async () => (await customerApi.post<Note>(`${API_BASE_URL}/api/notes`, input, { headers: await headers() })).data, "Failed to save the note");
}

export async function updateNoteAction(id: string, changes: NoteInput): Promise<WritingResult<Note>> {
  return callApi(async () => (await customerApi.patch<Note>(`${API_BASE_URL}/api/notes/${id}`, changes, { headers: await headers() })).data, "Failed to save the note");
}

export async function deleteNoteAction(id: string): Promise<WritingResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/notes/${id}`, { headers: await headers() });
  }, "Failed to delete the note");
}

export async function createNoteCategoryAction(name: string, color?: NoteCategoryColor): Promise<WritingResult<NoteCategory>> {
  return callApi(
    async () => (await customerApi.post<NoteCategory>(`${API_BASE_URL}/api/notes/categories`, { name, ...(color && { color }) }, { headers: await headers() })).data,
    "Failed to add the category",
  );
}

export async function updateNoteCategoryAction(id: string, changes: { name?: string; color?: NoteCategoryColor }): Promise<WritingResult<NoteCategory>> {
  return callApi(
    async () => (await customerApi.patch<NoteCategory>(`${API_BASE_URL}/api/notes/categories/${id}`, changes, { headers: await headers() })).data,
    "Failed to save the category",
  );
}

export async function deleteNoteCategoryAction(id: string): Promise<WritingResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/notes/categories/${id}`, { headers: await headers() });
  }, "Failed to delete the category");
}

// ---- Journal ----

export interface JournalEntryInput {
  kind: JournalKind;
  mood: number;
  wentWell: string;
  gratefulFor: string;
  tomorrow: string;
  body: string;
  categoryId: string | null;
  isPrivate: boolean;
}

export async function saveJournalEntryAction(date: string, input: JournalEntryInput): Promise<WritingResult<JournalEntry>> {
  return callApi(async () => (await customerApi.put<JournalEntry>(`${API_BASE_URL}/api/journal/${date}`, input, { headers: await headers(true) })).data, "Failed to save the entry");
}

// The month a page opens on, read again after the diary opens or closes.
export async function getJournalMonthAction(month: string): Promise<WritingResult<JournalMonth>> {
  return callApi(async () => (await customerApi.get<JournalMonth>(`${API_BASE_URL}/api/journal`, { headers: await headers(true), params: { month } })).data, "Failed to load the journal");
}

export async function searchJournalAction(q: string): Promise<WritingResult<{ unlocked: boolean; entries: JournalEntry[] }>> {
  return callApi(
    async () => (await customerApi.get<{ unlocked: boolean; entries: JournalEntry[] }>(`${API_BASE_URL}/api/journal/search`, { headers: await headers(true), params: { q } })).data,
    "Failed to search the journal",
  );
}

// Sets the diary PIN (replacing one takes the account password); the diary
// is open right after.
export async function setDiaryPinAction(pin: string, password?: string): Promise<WritingResult> {
  return callApi(async () => {
    const res = await customerApi.post<{ unlockToken: string }>(`${API_BASE_URL}/api/journal/pin`, { pin, ...(password && { password }) }, { headers: await headers() });
    await setJournalUnlock(res.data.unlockToken);
  }, "Failed to set the PIN");
}

export async function unlockDiaryAction(pin: string): Promise<WritingResult> {
  return callApi(async () => {
    const res = await customerApi.post<{ unlockToken: string }>(`${API_BASE_URL}/api/journal/unlock`, { pin }, { headers: await headers() });
    await setJournalUnlock(res.data.unlockToken);
  }, "Failed to unlock the diary");
}

export async function lockDiaryAction(): Promise<WritingResult> {
  return callApi(() => clearJournalUnlock(), "Failed to lock the diary");
}
