"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type Account, type AccountType } from "./api";
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

// A failure carries the API's own message only. Without one, message stays
// undefined and the caller shows its own words in the reader's language
// (t(result.message ?? "Failed to ...")), which an English fallback made
// here would always win over.
async function callApi<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { success: false, message: getApiErrorMessage(error.response?.data, "") || undefined };
    }
    return { success: false };
  }
}

export interface AccountFormInput {
  name: string;
  nameBn?: string;
  accountNumber?: string;
  accountType: AccountType;
  accountSubtype?: string;
  parentId?: string;
  // Create-only, same convention as Contact.openingBalance -- see
  // UpdateAccountDto on the backend for why it's excluded from edits.
  openingBalance?: string;
}

export async function createAccountAction(businessId: string, input: AccountFormInput): Promise<ActionResult<Account>> {
  return callApi(async () => {
    const res = await customerApi.post<Account>(`${API_BASE_URL}/api/businesses/${businessId}/accounts`, input, { headers: await authHeaders() });
    return res.data;
  });
}

// What an edit may change -- the backend refuses accountType (an account's
// type is fixed once it has children) and any unknown field, so sending the
// create shape made every edit fail. parentId null moves it back to the top.
export interface AccountUpdateInput {
  name?: string;
  nameBn?: string;
  accountNumber?: string;
  accountSubtype?: string;
  parentId?: string | null;
}

export async function updateAccountAction(businessId: string, id: string, input: AccountUpdateInput): Promise<ActionResult<Account>> {
  return callApi(async () => {
    const res = await customerApi.patch<Account>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/${id}`, input, { headers: await authHeaders() });
    return res.data;
  });
}

export async function archiveAccountAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.patch(`${API_BASE_URL}/api/businesses/${businessId}/accounts/${id}/archive`, {}, { headers: await authHeaders() });
  });
}

export async function unarchiveAccountAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.patch(`${API_BASE_URL}/api/businesses/${businessId}/accounts/${id}/unarchive`, {}, { headers: await authHeaders() });
  });
}

// Permanently deletes the account if it has no real transaction history, or
// falls back to archiving it if it has any -- see the backend's
// AccountsService.removeOrArchive() for the exact rule. `data.deleted`
// tells the caller which one actually happened, for the right toast text.
export async function removeAccountAction(businessId: string, id: string): Promise<ActionResult<{ deleted: boolean }>> {
  return callApi(async () => {
    const response = await customerApi.delete<{ deleted: boolean }>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/${id}`, {
      headers: await authHeaders(),
    });
    return response.data;
  });
}
