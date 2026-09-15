// Server-only helpers, same shape as lib/transactions.ts's getTransactions().
import axios from "axios";
import { cache } from "react";
import { API_BASE_URL, type BudgetCategoryType, type BudgetOverview, type IncomeGoalSummary } from "./api";
import { getAccessToken } from "./tokenCookies";

export const getBudgetOverview = cache(
  async (businessId: string, month?: number, year?: number, type: BudgetCategoryType = "EXPENSE"): Promise<BudgetOverview> => {
    const empty: BudgetOverview = { month: month ?? 1, year: year ?? 2000, type, totalBudget: null, allocated: "0.00", categories: [] };
    const accessToken = await getAccessToken();
    if (!accessToken) return empty;

    try {
      const response = await axios.get<BudgetOverview>(`${API_BASE_URL}/api/businesses/${businessId}/budget`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { month, year, type },
      });
      return response.data;
    } catch {
      return empty;
    }
  },
);

export const getIncomeGoals = cache(async (businessId: string): Promise<IncomeGoalSummary[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await axios.get<IncomeGoalSummary[]>(`${API_BASE_URL}/api/businesses/${businessId}/budget/income-goals`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return [];
  }
});
