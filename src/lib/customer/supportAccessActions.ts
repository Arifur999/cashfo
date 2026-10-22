"use server";

import axios from "axios";
import { TOO_MANY_ATTEMPTS_MESSAGE } from "@/lib/actionError";
import { getAccessToken } from "@/lib/tokenUtils";
import { API_BASE_URL, getApiErrorMessage } from "./api";
import type { ActionResult } from "./authActions";
import { customerApi } from "./apiClient";

// The customer's consent to "View as customer": a one-time code they read
// out to support (see the backend's SupportAccessService).
export interface SupportAccessStatus {
  // A code is waiting, until expiresAt.
  active: boolean;
  expiresAt: string | null;
  // When support last opened the account, and whether a view is open now.
  lastViewedAt: string | null;
  viewOpen: boolean;
}

async function authHeaders() {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${accessToken}` };
}

async function callApi<T>(fn: () => Promise<T>, fallbackMessage: string): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await fn() };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) return { success: false, message: TOO_MANY_ATTEMPTS_MESSAGE };
      return { success: false, message: getApiErrorMessage(error.response?.data, fallbackMessage) };
    }
    return { success: false, message: fallbackMessage };
  }
}

const ROUTE = `${API_BASE_URL}/api/auth/support-access`;

export async function getSupportAccessAction(): Promise<ActionResult<SupportAccessStatus>> {
  return callApi(async () => (await customerApi.get<SupportAccessStatus>(ROUTE, { headers: await authHeaders() })).data, "Couldn't load support access");
}

export async function createSupportCodeAction(): Promise<ActionResult<{ code: string; expiresAt: string }>> {
  return callApi(async () => (await customerApi.post<{ code: string; expiresAt: string }>(ROUTE, undefined, { headers: await authHeaders() })).data, "Couldn't make a support code");
}

export async function revokeSupportAccessAction(): Promise<ActionResult<{ ended: number }>> {
  return callApi(async () => (await customerApi.delete<{ ended: number }>(ROUTE, { headers: await authHeaders() })).data, "Couldn't turn off support access");
}
