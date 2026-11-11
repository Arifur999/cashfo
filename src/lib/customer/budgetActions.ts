"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type BudgetCategory, type BudgetCategoryType, type BudgetOverview, type MonthlyPlan } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { customerApi } from "./apiClient";

// Client components (e.g. AddTransactionModal, which needs this to offer a
// business's custom categories in its Category dropdown) can't call
// lib/budgets.ts's getBudgetOverview() directly -- that's a plain
// server-only module (next/headers-based cookie read), not a Server Action.
export type BudgetCategoryName = Pick<BudgetCategory, "id" | "name" | "icon" | "color">;

export async function getBudgetCategoryNamesAction(businessId: string, type: BudgetCategoryType = "EXPENSE"): Promise<BudgetCategoryName[]> {
  const result = await listBudgetCategoryNamesAction(businessId, type);
  return result.data ?? [];
}

// The same names for a form that says "No categories yet" when there are
// none: a failed request comes back as success: false, never as an empty
// list, so the form can't treat an outage as "nothing to pick".
export async function listBudgetCategoryNamesAction(businessId: string, type: BudgetCategoryType = "EXPENSE"): Promise<ActionResult<BudgetCategoryName[]>> {
  return callApi(async () => {
    const res = await customerApi.get<BudgetCategoryName[]>(`${API_BASE_URL}/api/businesses/${businessId}/budget/categories`, { headers: await authHeaders(), params: { type } });
    return res.data;
  }, "Failed to load your categories");
}

// The month's budget for the New transaction drawer's "left this month"
// hint; null when it can't be read, and the hint simply stays off.
export async function getBudgetOverviewAction(businessId: string, month: number, year: number): Promise<BudgetOverview | null> {
  try {
    const res = await customerApi.get<BudgetOverview>(`${API_BASE_URL}/api/businesses/${businessId}/budget`, { headers: await authHeaders(), params: { month, year, type: "EXPENSE" } });
    return res.data;
  } catch {
    return null;
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
  // Left out, the API picks a colour no category of the type uses yet.
  color?: string;
  // An expense category's own monthly limit, optional; never for INCOME.
  monthlyLimit?: number;
}

// null clears the budget (0 is refused): every month then measures against
// what the categories were given.
export async function updateBudgetTargetAction(businessId: string, monthlyBudgetTarget: number | null): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.patch(`${API_BASE_URL}/api/businesses/${businessId}/budget`, { monthlyBudgetTarget }, { headers: await authHeaders() });
  }, "Failed to update total budget");
}

export async function createBudgetCategoryAction(businessId: string, input: BudgetCategoryFormInput): Promise<ActionResult<BudgetCategory>> {
  return callApi(async () => {
    const res = await customerApi.post<BudgetCategory>(`${API_BASE_URL}/api/businesses/${businessId}/budget/categories`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to create category");
}

export async function updateBudgetCategoryAction(
  businessId: string,
  id: string,
  // The type changes only while no transaction uses the category.
  input: Partial<BudgetCategoryFormInput>,
): Promise<ActionResult<BudgetCategory>> {
  return callApi(async () => {
    const res = await customerApi.patch<BudgetCategory>(`${API_BASE_URL}/api/businesses/${businessId}/budget/categories/${id}`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to update category");
}

// A category its transactions use is deleted only with `moveTo`, the
// category of the same type they move to; `movedEntryIds` names the
// entries that did (an older backend leaves it out), for Undo.
export async function deleteBudgetCategoryAction(businessId: string, id: string, moveTo?: string): Promise<ActionResult<{ id: string; moved: number; movedEntryIds?: string[] }>> {
  return callApi(async () => {
    const res = await customerApi.delete<{ id: string; moved: number; movedEntryIds?: string[] }>(`${API_BASE_URL}/api/businesses/${businessId}/budget/categories/${id}`, {
      headers: await authHeaders(),
      params: moveTo ? { moveTo } : undefined,
    });
    return res.data;
  }, "Failed to delete category");
}

// Undo of a category delete: the category made again as it was, and the
// entries the delete moved carried back from the category they went to.
export async function restoreBudgetCategoryAction(businessId: string, input: BudgetCategoryFormInput & { movedTo?: string; entryIds?: string[] }): Promise<ActionResult<BudgetCategory>> {
  return callApi(async () => {
    const res = await customerApi.post<BudgetCategory>(`${API_BASE_URL}/api/businesses/${businessId}/budget/categories/restore`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to create category");
}

// Category Set's "Add the usual ones": the starter categories the workspace
// doesn't have yet.
export async function addStarterCategoriesAction(businessId: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.post(`${API_BASE_URL}/api/businesses/${businessId}/budget/categories/starter`, {}, { headers: await authHeaders() });
  }, "Failed to add the categories");
}

export interface MonthlyPlanInput {
  month: number;
  year: number;
  incomeTarget: number;
  expenseBudget: number;
  // An edit that picked another month: the month the plan is in now (it
  // moves to month/year).
  fromMonth?: number;
  fromYear?: number;
}

// Budget Planning > Set monthly budget: makes the month's plan or replaces it.
export async function saveMonthlyPlanAction(businessId: string, input: MonthlyPlanInput): Promise<ActionResult<MonthlyPlan>> {
  return callApi(async () => {
    const res = await customerApi.put<MonthlyPlan>(`${API_BASE_URL}/api/businesses/${businessId}/budget/monthly-plan`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to save the budget");
}

// Budget Planning > Delete: drops a month's plan (its income target and
// expense budget, one income-goal row); the month's transactions stay.
export async function deleteMonthlyPlanAction(businessId: string, planId: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/businesses/${businessId}/budget/income-goals/${planId}`, { headers: await authHeaders() });
  }, "Failed to delete the plan");
}
