"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type EntryType, type Transaction, type TransactionType } from "./api";
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

export interface CreateTransactionEntryInput {
  accountId: string;
  entryType: EntryType;
  amount: number;
}

export interface CreateTransactionInput {
  transactionType: TransactionType;
  transactionDate: string;
  description?: string;
  referenceNo?: string;
  entries: CreateTransactionEntryInput[];
}

export async function createTransactionAction(businessId: string, input: CreateTransactionInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    // Generated per-submit so a genuine double-click/network-retry hits the
    // backend's idempotency short-circuit instead of creating two postings --
    // NOT persisted/reused across separate user-initiated submits.
    const idempotencyKey = crypto.randomUUID();
    const res = await axios.post<Transaction>(
      `${API_BASE_URL}/api/businesses/${businessId}/transactions`,
      { ...input, idempotencyKey },
      { headers: await authHeaders() },
    );
    return res.data;
  }, "Failed to create transaction");
}

export async function voidTransactionAction(businessId: string, id: string, reason: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.post(`${API_BASE_URL}/api/businesses/${businessId}/transactions/${id}/void`, { reason }, { headers: await authHeaders() });
  }, "Failed to void transaction");
}
