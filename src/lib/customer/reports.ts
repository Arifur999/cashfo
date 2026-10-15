// Server-only helpers, same shape as lib/auth.ts's getCurrentUser().
import { cache } from "react";
import { API_BASE_URL, type CategoryBreakdown, type IncomeVsSavingsPoint, type MonthlyBreakdown } from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";

const EMPTY_CATEGORY_BREAKDOWN = (type: "INCOME" | "EXPENSE"): CategoryBreakdown => ({ type, total: "0.00", categories: [] });
const EMPTY_MONTHLY_BREAKDOWN = (type: "INCOME" | "EXPENSE"): MonthlyBreakdown => ({ type, months: [], rows: [], totals: [], total: "0.00" });

export const getCategoryBreakdown = cache(
  async (businessId: string, type: "INCOME" | "EXPENSE", dateFrom?: string, dateTo?: string): Promise<CategoryBreakdown> => {
    const accessToken = await getAccessToken();
    if (!accessToken) return EMPTY_CATEGORY_BREAKDOWN(type);

    try {
      const response = await customerApi.get<CategoryBreakdown>(`${API_BASE_URL}/api/businesses/${businessId}/reports/category-breakdown`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { type, dateFrom, dateTo },
      });
      return response.data;
    } catch (error) {
      return emptyUnlessOutage(error, EMPTY_CATEGORY_BREAKDOWN(type));
    }
  },
);

// One column per calendar month between the two days (at most 24 months),
// optionally only what touched one wallet.
export const getMonthlyBreakdown = cache(
  async (businessId: string, type: "INCOME" | "EXPENSE", dateFrom: string, dateTo: string, accountId?: string): Promise<MonthlyBreakdown> => {
    const accessToken = await getAccessToken();
    if (!accessToken) return EMPTY_MONTHLY_BREAKDOWN(type);

    try {
      const response = await customerApi.get<MonthlyBreakdown>(`${API_BASE_URL}/api/businesses/${businessId}/reports/monthly-breakdown`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { type, dateFrom, dateTo, accountId },
      });
      return response.data;
    } catch (error) {
      return emptyUnlessOutage(error, EMPTY_MONTHLY_BREAKDOWN(type));
    }
  },
);

export const getIncomeVsSavingsTrend = cache(async (businessId: string, months = 6): Promise<IncomeVsSavingsPoint[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await customerApi.get<IncomeVsSavingsPoint[]>(`${API_BASE_URL}/api/businesses/${businessId}/reports/income-vs-savings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { months },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});
