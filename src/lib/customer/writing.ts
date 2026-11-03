// Server-only readers for Habit Tracker > Write: notes and the journal.
// User-scoped (no :businessId), like lib/customer/todos.ts. The journal's
// reads carry the diary unlock, when this browser holds one, so private
// entries come back open.
import { cache } from "react";
import { API_BASE_URL, type JournalMonth, type JournalSummary, type NotesOverview } from "./api";
import { getAccessToken, getJournalUnlock } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";
import { JOURNAL_UNLOCK_HEADER } from "./writingDisplay";

async function authHeaders(withUnlock = false): Promise<Record<string, string> | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  const unlock = withUnlock ? await getJournalUnlock() : undefined;
  return { Authorization: `Bearer ${accessToken}`, ...(unlock && { [JOURNAL_UNLOCK_HEADER]: unlock }) };
}

// Null when the request failed (never "no notes yet" for an outage).
export const getNotesOverview = cache(async (): Promise<NotesOverview | null> => {
  const headers = await authHeaders();
  if (!headers) return null;
  try {
    const res = await customerApi.get<NotesOverview>(`${API_BASE_URL}/api/notes`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});

export const getJournalMonth = cache(async (month: string): Promise<JournalMonth | null> => {
  const headers = await authHeaders(true);
  if (!headers) return null;
  try {
    const res = await customerApi.get<JournalMonth>(`${API_BASE_URL}/api/journal`, { headers, params: { month } });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});

export const getJournalSummary = cache(async (): Promise<JournalSummary | null> => {
  const headers = await authHeaders();
  if (!headers) return null;
  try {
    const res = await customerApi.get<JournalSummary>(`${API_BASE_URL}/api/journal/summary`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});
