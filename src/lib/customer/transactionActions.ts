"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type EntryType, type Transaction, type TransactionType } from "./api";
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

export interface CreateTransactionEntryInput {
  accountId: string;
  entryType: EntryType;
  amount: number;
  // A journal line's own note ("Cheque 004418").
  note?: string;
}

export interface CreateTransactionInput {
  transactionType: TransactionType;
  transactionDate: string;
  description?: string;
  referenceNo?: string;
  entries: CreateTransactionEntryInput[];
  // One per form fill (see JournalEntryForm): a resubmit of the same entry
  // -- a double click, a retried request -- is answered with the posting
  // already made instead of making a second one.
  idempotencyKey?: string;
}

export async function createTransactionAction(businessId: string, input: CreateTransactionInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    // A key made here would be new on every call, so two submits of one
    // entry would still post twice; the form supplies one per fill.
    const idempotencyKey = input.idempotencyKey ?? crypto.randomUUID();
    const res = await customerApi.post<Transaction>(
      `${API_BASE_URL}/api/businesses/${businessId}/transactions`,
      { ...input, idempotencyKey },
      { headers: await authHeaders() },
    );
    return res.data;
  }, "Failed to create transaction");
}

export async function voidTransactionAction(businessId: string, id: string, reason: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.post(`${API_BASE_URL}/api/businesses/${businessId}/transactions/${id}/void`, { reason }, { headers: await authHeaders() });
  }, "Failed to void transaction");
}
