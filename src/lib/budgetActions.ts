"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type BudgetCategory, type BudgetCategoryType, type IncomeGoal } from "./api";
import { getAccessToken } from "./tokenCookies";

// Client components (e.g. AddTransactionModal, which needs this to offer a
// business's custom categories in its Category dropdown) can't call
// lib/budgets.ts's getBudgetOverview() directly -- that's a plain
// server-only module (next/headers-based cookie read), not a Server Action.
export async function getBudgetCategoryNamesAction(
  businessId: string,
  type: BudgetCategoryType = "EXPENSE",
): Promise<Pick<BudgetCategory, "id" | "name" | "icon" | "color">[]> {
  try {
    const res = await axios.get<Pick<BudgetCategory, "id" | "name" | "icon" | "color">[]>(
      `${API_BASE_URL}/api/businesses/${businessId}/budget/categories`,
      { headers: await authHeaders(), params: { type } },
    );
    return res.data;
  } catch {
    return [];
  }
}

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

export interface BudgetCategoryFormInput {
  type: BudgetCategoryType;
  name: string;
  // null = no icon chosen -- persisted as a plain colored circle, no glyph.
  icon: string | null;
  color: string;
  // Required for EXPENSE, omitted for INCOME (which has no per-category
  // goal -- see BudgetCategory.monthlyLimit's schema comment).
  monthlyLimit?: number;
}

export async function updateBudgetTargetAction(businessId: string, monthlyBudgetTarget: number): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/api/businesses/${businessId}/budget`, { monthlyBudgetTarget }, { headers: await authHeaders() });
  }, "Failed to update total budget");
}

export interface IncomeGoalFormInput {
  month: number;
  year: number;
  amount: number;
  notes?: string;
}

export async function createIncomeGoalAction(businessId: string, input: IncomeGoalFormInput): Promise<ActionResult<IncomeGoal>> {
  return callApi(async () => {
    const res = await axios.post<IncomeGoal>(`${API_BASE_URL}/api/businesses/${businessId}/budget/income-goals`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to save the income goal");
}

export async function updateIncomeGoalAction(
  businessId: string,
  id: string,
  input: Partial<IncomeGoalFormInput>,
): Promise<ActionResult<IncomeGoal>> {
  return callApi(async () => {
    const res = await axios.patch<IncomeGoal>(`${API_BASE_URL}/api/businesses/${businessId}/budget/income-goals/${id}`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to update the income goal");
}

export async function deleteIncomeGoalAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.delete(`${API_BASE_URL}/api/businesses/${businessId}/budget/income-goals/${id}`, { headers: await authHeaders() });
  }, "Failed to delete the income goal");
}

export async function createBudgetCategoryAction(businessId: string, input: BudgetCategoryFormInput): Promise<ActionResult<BudgetCategory>> {
  return callApi(async () => {
    const res = await axios.post<BudgetCategory>(`${API_BASE_URL}/api/businesses/${businessId}/budget/categories`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to create category");
}

export async function updateBudgetCategoryAction(
  businessId: string,
  id: string,
  input: Partial<Omit<BudgetCategoryFormInput, "type">>,
): Promise<ActionResult<BudgetCategory>> {
  return callApi(async () => {
    const res = await axios.patch<BudgetCategory>(`${API_BASE_URL}/api/businesses/${businessId}/budget/categories/${id}`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to update category");
}

export async function deleteBudgetCategoryAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.delete(`${API_BASE_URL}/api/businesses/${businessId}/budget/categories/${id}`, { headers: await authHeaders() });
  }, "Failed to delete category");
}
