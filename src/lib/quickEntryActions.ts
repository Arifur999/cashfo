"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type Account, type Transaction } from "./api";
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

// Fetched fresh each time a modal opens (same pattern as
// CreateWorkspaceModal's getBusinessLimitsAction) -- these lists rarely
// change but must never go stale mid-session.
export async function getMoneyAccountsAction(businessId: string): Promise<Account[]> {
  try {
    const res = await axios.get<Account[]>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/money-accounts`, { headers: await authHeaders() });
    return res.data;
  } catch {
    return [];
  }
}

export async function getIncomeAccountsAction(businessId: string): Promise<Account[]> {
  try {
    const res = await axios.get<Account[]>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/income-accounts`, { headers: await authHeaders() });
    return res.data;
  } catch {
    return [];
  }
}

export async function getExpenseAccountsAction(businessId: string): Promise<Account[]> {
  try {
    const res = await axios.get<Account[]>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/expense-accounts`, { headers: await authHeaders() });
    return res.data;
  } catch {
    return [];
  }
}

export interface AddIncomeInput {
  toAccountId: string;
  incomeAccountId?: string;
  amount: number;
  date: string;
  description?: string;
  categoryId?: string;
}

export async function createIncomeAction(businessId: string, input: AddIncomeInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await axios.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/income`, input, { headers: await authHeaders() });
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
}

export async function createExpenseAction(businessId: string, input: AddExpenseInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await axios.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/expense`, input, { headers: await authHeaders() });
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

export async function createTransferAction(businessId: string, input: AddTransferInput): Promise<ActionResult<Transaction>> {
  return callApi(async () => {
    const res = await axios.post<Transaction>(`${API_BASE_URL}/api/businesses/${businessId}/transfer`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create transfer");
}
