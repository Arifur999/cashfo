"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type BudgetCategory, type BudgetCategoryType, type BudgetOverview } from "./api";
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
  color: string;
  // Required for EXPENSE, omitted for INCOME (which has no per-category
  // goal -- see BudgetCategory.monthlyLimit's schema comment).
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
  input: Partial<Omit<BudgetCategoryFormInput, "type">>,
): Promise<ActionResult<BudgetCategory>> {
  return callApi(async () => {
    const res = await customerApi.patch<BudgetCategory>(`${API_BASE_URL}/api/businesses/${businessId}/budget/categories/${id}`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to update category");
}

export async function deleteBudgetCategoryAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/businesses/${businessId}/budget/categories/${id}`, { headers: await authHeaders() });
  }, "Failed to delete category");
}
