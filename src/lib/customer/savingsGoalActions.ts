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

// The fallback is the English key the page already translates ("Failed to
// add money"), so a failure with no message of its own still reads in
// Bangla; savingsError() in savingsDisplay.ts words the backend's own.
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

// Client components (the goal's details drawer, opened on demand from the
// dashboard list) can't call lib/savingsGoals.ts's getSavingsGoal() directly
// -- that's a plain server-only module, not a Server Action. A result, not a
// bare null, so the drawer can tell a failed load (and offer to try again)
// from a goal with no history.
export async function getSavingsGoalDetailAction(businessId: string, id: string): Promise<ActionResult<SavingsGoalDetail>> {
  return callApi(async () => {
    const res = await customerApi.get<SavingsGoalDetail>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${id}`, { headers: await authHeaders() });
    return res.data;
  }, "Couldn't load this goal's history.");
}

export interface SavingsGoalFormInput {
  name: string;
  targetAmount: number;
  targetDate: string;
  durationMonths: number;
  // null clears a reminder on an edit (the backend accepts it there).
  reminderDate?: string | null;
  reminderChannel?: SavingsReminderChannel | null;
  // "" clears the description on an edit; undefined leaves it as it is.
  description?: string;
}

export async function createSavingsGoalAction(businessId: string, input: SavingsGoalFormInput): Promise<ActionResult<SavingsGoal>> {
  return callApi(async () => {
    const res = await customerApi.post<SavingsGoal>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save goal");
}

export async function updateSavingsGoalAction(
  businessId: string,
  id: string,
  input: Partial<SavingsGoalFormInput>,
): Promise<ActionResult<SavingsGoal>> {
  return callApi(async () => {
    const res = await customerApi.patch<SavingsGoal>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${id}`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to save goal");
}

export async function updateSavingsGoalStatusAction(businessId: string, id: string, status: SavingsGoalStatus): Promise<ActionResult<SavingsGoal>> {
  return callApi(async () => {
    const res = await customerApi.patch<SavingsGoal>(
      `${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${id}/status`,
      { status },
      { headers: await authHeaders() },
    );
    return res.data;
  }, "Failed to update goal");
}

export async function deleteSavingsGoalAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${id}`, { headers: await authHeaders() });
  }, "Failed to delete goal");
}

// The savings wallets a new contribution or withdrawal can use -- client
// components can't call lib/accounts.ts's getSavingsWallets() directly
// (server-only), and these pickers only need ACTIVE wallets, same "active-
// only for a new transaction" convention as listMoneyAccountsAction(). A
// result, so a drawer can say the load failed instead of "no savings wallet
// yet".
export async function listActiveSavingsWalletsAction(businessId: string): Promise<ActionResult<Account[]>> {
  return callApi(async () => {
    const res = await customerApi.get<Account[]>(`${API_BASE_URL}/api/businesses/${businessId}/accounts/active-savings-wallets`, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Couldn't load your savings wallets.");
}

// The plain list, empty when it could not be loaded -- for pickers elsewhere
// (Assets, Referrals) that only need something to offer.
export async function getActiveSavingsWalletsAction(businessId: string): Promise<Account[]> {
  const result = await listActiveSavingsWalletsAction(businessId);
  return result.data ?? [];
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
    const res = await customerApi.post<SavingsGoalEntry>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${goalId}/contributions`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to add money");
}

export interface WithdrawSavingsGoalInput {
  savingsAccountId: string;
  expenseAccountId: string;
  categoryId?: string;
  date: string;
  notes?: string;
}

// "Cash out" a fully (or partially) saved goal -- see SavingsGoalsService.
// withdraw()'s comment. Always withdraws the goal's entire current saved
// amount; there's no amount field to send.
export async function withdrawSavingsGoalAction(businessId: string, goalId: string, input: WithdrawSavingsGoalInput): Promise<ActionResult<SavingsGoalEntry>> {
  return callApi(async () => {
    const res = await customerApi.post<SavingsGoalEntry>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${goalId}/withdraw`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to withdraw");
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
    await customerApi.post(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/transfer`, input, { headers: await authHeaders() });
  }, "Failed to move");
}
