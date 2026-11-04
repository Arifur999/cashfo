"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type ContactBalanceDetail, type Transaction } from "./api";
import type { LoanEntryKind } from "./loanDisplay";
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

// The API's own message, when it sent one; otherwise none, so the drawer
// says its own fallback through t() and it reads in Bangla.
const apiMessage = (body: unknown): string | undefined => getApiErrorMessage(body, "") || undefined;

async function callApi<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, message: axios.isAxiosError(error) ? apiMessage(error.response?.data) : undefined };
  }
}

export interface RecordInvoiceInput {
  contactId: string;
  amount: number;
  date: string;
  dueDate?: string;
  description?: string;
  // The invoice or bill number, as it reads on paper.
  referenceNo?: string;
  // Which income (sale) or expense (purchase) account the amount lands in;
  // the workspace's default when left out.
  incomeAccountId?: string;
  expenseAccountId?: string;
  // Required when the contact's category is LOAN (giving/taking a loan
  // moves real cash), ignored for a BUSINESS contact's credit sale/
  // purchase (revenue/expense recognized now, cash moves later).
  moneyAccountId?: string;
  // A bank or service charge paid with a loan entry, out of its wallet.
  charge?: number;
}

export async function recordSaleAction(businessId: string, input: RecordInvoiceInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await customerApi.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/receivables`, input, { headers: await authHeaders() });
    return res.data;
  });
}

export async function recordPurchaseAction(businessId: string, input: RecordInvoiceInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await customerApi.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/payables`, input, { headers: await authHeaders() });
    return res.data;
  });
}

export interface RecordPaymentInput {
  contactId: string;
  amount: number;
  date: string;
  moneyAccountId: string;
  description?: string;
  // The slip or cheque number, as the statement's Reference column shows it.
  referenceNo?: string;
  appliedToTransactionId?: string;
  charge?: number;
}

export async function receivePaymentAction(businessId: string, input: RecordPaymentInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await customerApi.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/payments/receive`, input, { headers: await authHeaders() });
    return res.data;
  });
}

export async function payPaymentAction(businessId: string, input: RecordPaymentInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await customerApi.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/payments/pay`, input, { headers: await authHeaders() });
    return res.data;
  });
}

// Edit: the loan entry is voided 'Corrected' and this one posted in its
// place, as one request. An entry stays the kind it was.
const CORRECT_PATHS: Record<LoanEntryKind, string> = {
  GIVE_LOAN: "receivables",
  TAKE_LOAN: "payables",
  RECEIVE_PAYMENT: "payments/receive",
  MAKE_PAYMENT: "payments/pay",
};

export async function correctLoanEntryAction(businessId: string, transactionId: string, kind: LoanEntryKind, input: RecordInvoiceInput | RecordPaymentInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await customerApi.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/${CORRECT_PATHS[kind]}/${transactionId}/correct`, input, { headers: await authHeaders() });
    return res.data;
  });
}

// On-demand fetch for modals opened from a list row (e.g. /dena-pawna's
// "Record Payment" quick action) where we only have a contactId, not the
// already-loaded page-level balance-detail -- same "fetch fresh on open"
// pattern as quickEntryActions.ts's getMoneyAccountsAction.
export async function getContactBalanceDetailAction(businessId: string, contactId: string): Promise<ContactBalanceDetail | null> {
  try {
    const res = await customerApi.get<ContactBalanceDetail>(`${API_BASE_URL}/api/businesses/${businessId}/contacts/${contactId}/balance-detail`, {
      headers: await authHeaders(),
    });
    return res.data;
  } catch {
    return null;
  }
}

// One loan entry as it was saved, to fill its Edit (the statement lists
// only what it shows); null when it can't be read.
export async function getLoanTransactionAction(businessId: string, transactionId: string): Promise<Transaction | null> {
  try {
    const res = await customerApi.get<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/transactions/${transactionId}`, { headers: await authHeaders() });
    return res.data;
  } catch {
    return null;
  }
}
