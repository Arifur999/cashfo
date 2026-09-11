"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type ContactBalanceDetail, type Transaction } from "./api";
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

export interface RecordInvoiceInput {
  contactId: string;
  amount: number;
  date: string;
  dueDate?: string;
  description?: string;
}

export async function recordSaleAction(businessId: string, input: RecordInvoiceInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await axios.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/receivables`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to record credit sale");
}

export async function recordPurchaseAction(businessId: string, input: RecordInvoiceInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await axios.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/payables`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to record credit purchase");
}

export interface RecordPaymentInput {
  contactId: string;
  amount: number;
  date: string;
  moneyAccountId: string;
  description?: string;
  appliedToTransactionId?: string;
}

export async function receivePaymentAction(businessId: string, input: RecordPaymentInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await axios.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/payments/receive`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to record payment");
}

export async function payPaymentAction(businessId: string, input: RecordPaymentInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await axios.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/payments/pay`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to record payment");
}

// On-demand fetch for modals opened from a list row (e.g. /dena-pawna's
// "Record Payment" quick action) where we only have a contactId, not the
// already-loaded page-level balance-detail -- same "fetch fresh on open"
// pattern as quickEntryActions.ts's getMoneyAccountsAction.
export async function getContactBalanceDetailAction(businessId: string, contactId: string): Promise<ContactBalanceDetail | null> {
  try {
    const res = await axios.get<ContactBalanceDetail>(`${API_BASE_URL}/api/businesses/${businessId}/contacts/${contactId}/balance-detail`, {
      headers: await authHeaders(),
    });
    return res.data;
  } catch {
    return null;
  }
}
