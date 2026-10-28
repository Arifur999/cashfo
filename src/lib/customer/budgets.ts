// Server-only helpers, same shape as lib/transactions.ts's getTransactions().
import { cache } from "react";
import { API_BASE_URL, type BudgetCategory, type BudgetCategoryType, type BudgetOverview, type CategorySet, type MonthlyPlan } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";

export const getBudgetOverview = cache(
  async (businessId: string, month?: number, year?: number, type: BudgetCategoryType = "EXPENSE"): Promise<BudgetOverview> => {
    const empty: BudgetOverview = { month: month ?? 1, year: year ?? 2000, type, totalBudget: null, allocated: "0.00", categories: [] };
    const accessToken = await getAccessToken();
    if (!accessToken) return empty;

    try {
      const response = await customerApi.get<BudgetOverview>(`${API_BASE_URL}/api/businesses/${businessId}/budget`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { month, year, type },
      });
      return response.data;
    } catch (error) {
      return emptyUnlessOutage(error, empty);
    }
  },
);

export type BudgetCategoryName = Pick<BudgetCategory, "id" | "name" | "icon" | "color">;

// Category names alone, for the Transactions page's category filter.
export const getBudgetCategoryNames = cache(async (businessId: string, type: BudgetCategoryType): Promise<BudgetCategoryName[]> => {
  try {
    const response = await customerApi.get<BudgetCategoryName[]>(`/api/businesses/${businessId}/budget/categories`, { params: { type } });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

// Budget Planning: one month as viewed (null figures when it has no plan).
// Null when it can't be read for a reason that isn't an outage.
export const getMonthlyPlan = cache(async (businessId: string, year: number, month: number): Promise<MonthlyPlan | null> => {
  try {
    const response = await customerApi.get<MonthlyPlan>(`/api/businesses/${businessId}/budget/monthly-plan`, { params: { year, month } });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});

// Every month with a plan, newest first.
export const getMonthlyPlans = cache(async (businessId: string): Promise<MonthlyPlan[]> => {
  try {
    const response = await customerApi.get<MonthlyPlan[]>(`/api/businesses/${businessId}/budget/monthly-plans`);
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

// Category Set: both kinds, with how many transactions use each.
export const getCategorySet = cache(async (businessId: string): Promise<CategorySet> => {
  try {
    const response = await customerApi.get<CategorySet>(`/api/businesses/${businessId}/budget/category-set`);
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, { income: [], expense: [] });
  }
});
