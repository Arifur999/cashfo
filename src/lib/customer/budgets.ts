// Server-only helpers, same shape as lib/transactions.ts's getTransactions().
import { cache } from "react";
import { API_BASE_URL, type BudgetCategoryType, type BudgetOverview } from "./api";
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
