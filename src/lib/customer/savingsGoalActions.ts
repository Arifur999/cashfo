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
  type SavingsPlan,
  type SavingsPlanHorizon,
  type SavingsPlanPriority,
  type SavingsReminderChannel,
  type SavingsStatement,
  type SavingsWalletHistoryRow,
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
  // The savings account the goal keeps its money in: every deposit goes
  // there, and so does the money already saved on a new goal.
  accountId?: string;
  startAmount?: number;
  // Its card colour (savingsColors.ts).
  color?: string;
  // Start goal on a saving plan: the plan is removed with the goal made.
  fromPlanId?: string;
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

// Catch up: a fresh plan to the same end date (with a monthly reminder
// email), or a later end date at the original pace.
export async function updateSavingsPlanAction(businessId: string, id: string, input: { mode: "RESET" } | { mode: "EXTEND"; targetDate: string }): Promise<ActionResult<SavingsGoal>> {
  return callApi(async () => {
    const res = await customerApi.patch<SavingsGoal>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${id}/plan`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to update goal");
}

export async function getSavingsStatementAction(businessId: string, id: string): Promise<ActionResult<SavingsStatement>> {
  return callApi(async () => {
    const res = await customerApi.get<SavingsStatement>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${id}/statement`, { headers: await authHeaders() });
    return res.data;
  }, "Couldn't load this goal's history.");
}

export async function getSavingsWalletHistoryAction(businessId: string, accountId: string): Promise<ActionResult<SavingsWalletHistoryRow[]>> {
  return callApi(async () => {
    const res = await customerApi.get<SavingsWalletHistoryRow[]>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/wallets/${accountId}/history`, { headers: await authHeaders() });
    return res.data;
  }, "Couldn't load this account's history.");
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
// (Assets) that only need something to offer. It reads an outage as an
// empty list, so a new picker should take listActiveSavingsWalletsAction().
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

export interface WithdrawToBalanceInput {
  amount: number;
  toAccountId: string;
  date: string;
  notes?: string;
}

// Any amount up to what is saved, to a main balance account; it comes out
// of the savings wallets holding the goal's money, largest first.
export async function withdrawToBalanceAction(businessId: string, goalId: string, input: WithdrawToBalanceInput): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.post(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${goalId}/withdrawals`, input, { headers: await authHeaders() });
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

// Takes a move back, while the goal it went to still holds the money.
export async function undoSavingsTransferAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/transfers/${id}`, { headers: await authHeaders() });
  }, "Failed to undo the move");
}

export interface AddProfitInput {
  amount: number;
  date: string;
  // The income category it counts under, by name.
  category: string;
  notes?: string;
}

// Profit the bank paid on a goal's savings: into the account the goal keeps
// its money in, counted as income.
export async function addProfitAction(businessId: string, goalId: string, input: AddProfitInput): Promise<ActionResult<SavingsGoalEntry>> {
  return callApi(async () => {
    const res = await customerApi.post<SavingsGoalEntry>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${goalId}/profits`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to add profit");
}

// Move back to plans: a goal nothing was recorded against becomes a saving
// plan again.
export async function moveGoalToPlansAction(businessId: string, goalId: string): Promise<ActionResult<{ planId: string }>> {
  return callApi(async () => {
    const res = await customerApi.post<{ planId: string }>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${goalId}/to-plan`, {}, { headers: await authHeaders() });
    return res.data;
  }, "Failed to move the goal");
}

export interface SavingsPlanInput {
  name: string;
  category: string;
  color: string;
  amount: number;
  horizon: SavingsPlanHorizon;
  // Only with BY_DATE.
  needBy?: string;
  priority: SavingsPlanPriority;
  note: string;
  link: string;
  // Undo of a delete: the day it was first planned.
  plannedOn?: string;
}

export async function createSavingsPlanAction(businessId: string, input: SavingsPlanInput): Promise<ActionResult<SavingsPlan>> {
  return callApi(async () => {
    const res = await customerApi.post<SavingsPlan>(`${API_BASE_URL}/api/businesses/${businessId}/savings-plans`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the plan");
}

export async function updateSavingsPlanEntryAction(businessId: string, id: string, input: SavingsPlanInput): Promise<ActionResult<SavingsPlan>> {
  return callApi(async () => {
    const res = await customerApi.patch<SavingsPlan>(`${API_BASE_URL}/api/businesses/${businessId}/savings-plans/${id}`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the plan");
}

export async function deleteSavingsPlanAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/businesses/${businessId}/savings-plans/${id}`, { headers: await authHeaders() });
  }, "Failed to delete the plan");
}
