"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type Account, type Transaction } from "./api";
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

// Without a fallbackMessage a failure carries the API's own message only:
// message stays undefined when there is none, so the caller's
// t(result.message ?? "...") shows its own words (as in accountActions.ts).
async function callApi<T>(fn: () => Promise<T>, fallbackMessage?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { success: false, message: getApiErrorMessage(error.response?.data, fallbackMessage ?? "") || undefined };
    }
    return { success: false, message: fallbackMessage };
  }
}

// Fetched fresh each time a modal opens (same pattern as
// CreateWorkspaceModal's getBusinessLimitsAction) -- these lists rarely
// change but must never go stale mid-session.
// For a form that says "No wallet yet" when the list is empty: a failed
// request comes back as success: false, never as an empty list.
export async function listMoneyAccountsAction(businessId: string): Promise<ActionResult<Account[]>> {
  return callApi(async () => {
    const res = await customerApi.get<Account[]>(`/api/businesses/${businessId}/accounts/money-accounts`);
    return res.data;
  }, "Failed to load your wallets");
}

// The plain list, empty when it could not be loaded -- for pickers that only
// need something to offer.
export async function getMoneyAccountsAction(businessId: string): Promise<Account[]> {
  const result = await listMoneyAccountsAction(businessId);
  return result.data ?? [];
}

export async function getIncomeAccountsAction(businessId: string): Promise<Account[]> {
  const result = await listIncomeAccountsAction(businessId);
  return result.data ?? [];
}

// The same list for a form that says "No income account yet" when it is
// empty: a failed request comes back as success: false, never as none.
export async function listIncomeAccountsAction(businessId: string): Promise<ActionResult<Account[]>> {
  return callApi(async () => {
    const res = await customerApi.get<Account[]>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/income-accounts`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to load your income accounts");
}

export async function getExpenseAccountsAction(businessId: string): Promise<Account[]> {
  const result = await listExpenseAccountsAction(businessId);
  return result.data ?? [];
}

// The same list for a form that says "No expense account yet" when it is
// empty: a failed request comes back as success: false, never as none.
export async function listExpenseAccountsAction(businessId: string): Promise<ActionResult<Account[]>> {
  return callApi(async () => {
    const res = await customerApi.get<Account[]>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/expense-accounts`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to load your expense accounts");
}

export interface AddIncomeInput {
  toAccountId: string;
  incomeAccountId?: string;
  amount: number;
  date: string;
  description?: string;
  categoryId?: string;
  note?: string;
  // A receipt or slip number (the loan statement's Reference column).
  referenceNo?: string;
  // A loan's profit or interest: the bank or person it came from.
  contactId?: string;
}

export async function createIncomeAction(businessId: string, input: AddIncomeInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await customerApi.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/income`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to add income");
}

export interface AddExpenseInput {
  fromAccountId: string;
  expenseAccountId: string;
  amount: number;
  date: string;
  description?: string;
  categoryId?: string;
  note?: string;
  // A receipt or slip number (the loan statement's Reference column).
  referenceNo?: string;
  // A loan's profit or interest: the bank or person it went to.
  contactId?: string;
}

export async function createExpenseAction(businessId: string, input: AddExpenseInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await customerApi.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/expense`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to add expense");
}

export interface AddTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
}

// No fallback: Balance's Move money and Quick entry each word the failure
// their own way (t(result.message ?? ...)).
export async function createTransferAction(businessId: string, input: AddTransferInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await customerApi.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/transfer`, input, { headers: await authHeaders() });
    return res.data;
  });
}

// Edit (decision D2): the API voids the entry ('Corrected') and posts the
// corrected one in the same request, answering with the new transaction.
export async function correctTransactionAction(
  businessId: string,
  transactionId: string,
  kind: "INCOME" | "EXPENSE" | "TRANSFER",
  input: AddIncomeInput | AddExpenseInput | AddTransferInput,
): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await customerApi.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/transactions/${transactionId}/correct/${kind.toLowerCase()}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the changes");
}
