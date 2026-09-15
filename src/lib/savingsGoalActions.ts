"use server";

import axios from "axios";
import {
  API_BASE_URL,
  getApiErrorMessage,
  type Account,
  type SavingsGoal,
  type SavingsGoalDetail,
  type SavingsGoalEntry,
  type SavingsGoalStatus,
  type SavingsReminderChannel,
} from "./api";
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

// Client components (the "View Details" modal, opened on demand from the
// dashboard list) can't call lib/savingsGoals.ts's getSavingsGoal() directly
// -- that's a plain server-only module, not a Server Action. Same reasoning
// as getBudgetCategoryNamesAction().
export async function getSavingsGoalDetailAction(businessId: string, id: string): Promise<SavingsGoalDetail | null> {
  try {
    const res = await axios.get<SavingsGoalDetail>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${id}`, { headers: await authHeaders() });
    return res.data;
  } catch {
    return null;
  }
}

export interface SavingsGoalFormInput {
  name: string;
  targetAmount: number;
  targetDate: string;
  durationMonths: number;
  reminderDate?: string;
  reminderChannel?: SavingsReminderChannel;
  description?: string;
}

export async function createSavingsGoalAction(businessId: string, input: SavingsGoalFormInput): Promise<ActionResult<SavingsGoal>> {
  return callApi(async () => {
    const res = await axios.post<SavingsGoal>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create savings goal");
}

export async function updateSavingsGoalAction(
  businessId: string,
  id: string,
  input: Partial<SavingsGoalFormInput>,
): Promise<ActionResult<SavingsGoal>> {
  return callApi(async () => {
    const res = await axios.patch<SavingsGoal>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${id}`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to update savings goal");
}

export async function updateSavingsGoalStatusAction(businessId: string, id: string, status: SavingsGoalStatus): Promise<ActionResult<SavingsGoal>> {
  return callApi(async () => {
    const res = await axios.patch<SavingsGoal>(
      `${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${id}/status`,
      { status },
      { headers: await authHeaders() },
    );
    return res.data;
  }, "Failed to update goal status");
}

export async function deleteSavingsGoalAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.delete(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${id}`, { headers: await authHeaders() });
  }, "Failed to delete savings goal");
}

// The AddContributionModal's "To Wallet" dropdown -- client components
// can't call lib/accounts.ts's getSavingsWallets() directly (server-only),
// and this picker only needs ACTIVE wallets, same "active-only for a new
// transaction" convention as getMoneyAccountsAction().
export async function getActiveSavingsWalletsAction(businessId: string): Promise<Account[]> {
  try {
    const res = await axios.get<Account[]>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/active-savings-wallets`, {
      headers: await authHeaders(),
    });
    return res.data;
  } catch {
    return [];
  }
}

export interface AddContributionInput {
  moneyAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  notes?: string;
}

export async function addContributionAction(businessId: string, goalId: string, input: AddContributionInput): Promise<ActionResult<SavingsGoalEntry>> {
  return callApi(async () => {
    const res = await axios.post<SavingsGoalEntry>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${goalId}/contributions`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to add contribution");
}

export interface SavingsTransferInput {
  fromGoalId: string;
  toGoalId: string;
  amount: number;
  date: string;
  notes?: string;
}

export async function createSavingsTransferAction(businessId: string, input: SavingsTransferInput): Promise<ActionResult> {
  return callApi(async () => {
    await axios.post(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/transfer`, input, { headers: await authHeaders() });
  }, "Failed to transfer between goals");
}
