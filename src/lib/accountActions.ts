"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type Account, type AccountType } from "./api";
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
    const res = await axios.post<Account>(`${API_BASE_URL}/api/businesses/${businessId}/accounts`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create account");
}

export async function updateAccountAction(businessId: string, id: string, input: Partial<AccountFormInput>): Promise<ActionResult<Account>> {
  return callApi(async () => {
    const res = await axios.patch<Account>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/${id}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to update account");
}

export async function archiveAccountAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/api/businesses/${businessId}/accounts/${id}/archive`, {}, { headers: await authHeaders() });
  }, "Failed to archive account");
}
