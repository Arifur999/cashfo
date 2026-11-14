"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage } from "./api";
import { customerApi } from "./apiClient";
import type { ActionResult } from "./authActions";
import type { CloseInput, EntryEditInput, EntryInput, Investment, InvestmentInput } from "./investmentTypes";

// Backend refusals the pages can say in the reader's language, matched by
// wording and answered with a dictionary key (the pages toast t(message)).
// Anything else passes through as the backend worded it.
const REFUSALS: { status?: number; pattern: RegExp; message: string }[] = [
  { pattern: /^this is more than the capital left/i, message: "This is more than the capital left." },
  { pattern: /^more capital has been taken back or lost/i, message: "More capital has been taken back or lost than this leaves. Change those entries first." },
  { pattern: /^some entries are dated before this day/i, message: "Some entries are dated before this day. Move the date to on or before the first entry." },
  { pattern: /^this is before the investment started/i, message: "This is before the investment started." },
  { pattern: /^this investment is closed\. reopen/i, message: "This investment is closed. Reopen it to add entries." },
  { pattern: /^close on or after the last entry/i, message: "Close on or after the last entry." },
  { pattern: /^add an income category first/i, message: "Add an income category first, to count the profit under." },
  { pattern: /is archived\. pick another account/i, message: "That account is archived. Pick another account." },
  { pattern: /^account not found in this workspace$/i, message: "That wallet isn't in this workspace. Pick another wallet." },
  { status: 409, pattern: /changed meanwhile/i, message: "This investment changed meanwhile. Reload and try again." },
  { pattern: /^a delete can be undone for 10 minutes only$/i, message: "A delete can be undone for 10 minutes only" },
  { status: 404, pattern: /^this delete can no longer be undone/i, message: "This delete can no longer be undone." },
  { status: 404, pattern: /^investment not found$/i, message: "This investment was deleted." },
  { status: 409, pattern: /can no longer be undone/i, message: "This changed again since, so it can no longer be undone." },
  { pattern: /can no longer be undone/i, message: "This can no longer be undone." },
  { status: 409, pattern: /^entries were added since it was reopened/i, message: "Entries were added since it was reopened. Close it again instead." },
];

async function callApi<T>(fn: () => Promise<T>, fallbackMessage: string): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await fn() };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = getApiErrorMessage(error.response?.data, fallbackMessage);
      const known = REFUSALS.find((refusal) => (refusal.status === undefined || refusal.status === error.response?.status) && refusal.pattern.test(message));
      return { success: false, message: known?.message ?? message };
    }
    return { success: false, message: fallbackMessage };
  }
}

const base = (businessId: string) => `${API_BASE_URL}/api/businesses/${businessId}/investments`;

export async function createInvestmentAction(businessId: string, input: InvestmentInput): Promise<ActionResult<Investment>> {
  return callApi(async () => (await customerApi.post<Investment>(base(businessId), input)).data, "Failed to add the investment");
}

// What an edit or a reopen answers: the investment, and the id its Undo takes.
type Undoable = Investment & { undoId?: string };

export async function updateInvestmentAction(businessId: string, id: string, input: InvestmentInput): Promise<ActionResult<Undoable>> {
  return callApi(async () => (await customerApi.patch<Undoable>(`${base(businessId)}/${id}`, input)).data, "Failed to save the changes");
}

// Undo of an edit, an entry's edit or a reopen.
export async function undoInvestmentChangeAction(businessId: string, id: string, undoId: string): Promise<ActionResult<Investment>> {
  return callApi(async () => (await customerApi.post<Investment>(`${base(businessId)}/${id}/undo/${encodeURIComponent(undoId)}`, {})).data, "Failed to undo");
}

// Kept for a few minutes: restoreInvestmentAction() undoes it.
export async function deleteInvestmentAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${base(businessId)}/${id}`);
  }, "Failed to delete the investment");
}

export async function restoreInvestmentAction(businessId: string, id: string): Promise<ActionResult<Investment>> {
  return callApi(async () => (await customerApi.post<Investment>(`${base(businessId)}/${id}/restore`, {})).data, "Failed to undo");
}

export async function addInvestmentEntryAction(businessId: string, id: string, input: EntryInput): Promise<ActionResult<{ entryId: string; investment: Investment }>> {
  return callApi(async () => (await customerApi.post<{ entryId: string; investment: Investment }>(`${base(businessId)}/${id}/entries`, input)).data, "Failed to save the entry");
}

export async function updateInvestmentEntryAction(businessId: string, id: string, entryId: string, input: EntryEditInput): Promise<ActionResult<Undoable>> {
  return callApi(async () => (await customerApi.patch<Undoable>(`${base(businessId)}/${id}/entries/${entryId}`, input)).data, "Failed to save the changes");
}

export async function deleteInvestmentEntryAction(businessId: string, id: string, entryId: string): Promise<ActionResult<Investment>> {
  return callApi(async () => (await customerApi.delete<Investment>(`${base(businessId)}/${id}/entries/${entryId}`)).data, "Failed to delete the entry");
}

export async function restoreInvestmentEntryAction(businessId: string, id: string, entryId: string): Promise<ActionResult<Investment>> {
  return callApi(async () => (await customerApi.post<Investment>(`${base(businessId)}/${id}/entries/${entryId}/restore`, {})).data, "Failed to undo");
}

export async function closeInvestmentAction(businessId: string, id: string, input: CloseInput): Promise<ActionResult<Investment>> {
  return callApi(async () => (await customerApi.post<Investment>(`${base(businessId)}/${id}/close`, input)).data, "Failed to close the investment");
}

export async function undoCloseInvestmentAction(businessId: string, id: string): Promise<ActionResult<Investment>> {
  return callApi(async () => (await customerApi.post<Investment>(`${base(businessId)}/${id}/undo-close`, {})).data, "Failed to undo");
}

export async function reopenInvestmentAction(businessId: string, id: string): Promise<ActionResult<Undoable>> {
  return callApi(async () => (await customerApi.post<Undoable>(`${base(businessId)}/${id}/reopen`, {})).data, "Failed to reopen the investment");
}
