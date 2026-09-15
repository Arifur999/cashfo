// Server-only helpers, same shape as lib/auth.ts's getCurrentUser().
import axios from "axios";
import { cache } from "react";
import {
  API_BASE_URL,
  type CategoryBreakdown,
  type GeneralLedgerResponse,
  type IncomeVsSavingsPoint,
  type TrialBalanceResponse,
} from "./api";
import { getAccessToken } from "./tokenCookies";

const EMPTY_GENERAL_LEDGER: GeneralLedgerResponse = { groups: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } };

export const getGeneralLedger = cache(async (businessId: string): Promise<GeneralLedgerResponse> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return EMPTY_GENERAL_LEDGER;

  try {
    const response = await axios.get<GeneralLedgerResponse>(`${API_BASE_URL}/api/businesses/${businessId}/ledger/general`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return EMPTY_GENERAL_LEDGER;
  }
});

const EMPTY_TRIAL_BALANCE: TrialBalanceResponse = { rows: [], totalDebit: "0", totalCredit: "0", isBalanced: true };

export const getTrialBalance = cache(async (businessId: string): Promise<TrialBalanceResponse> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return EMPTY_TRIAL_BALANCE;

  try {
    const response = await axios.get<TrialBalanceResponse>(`${API_BASE_URL}/api/businesses/${businessId}/reports/trial-balance`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return EMPTY_TRIAL_BALANCE;
  }
});

const EMPTY_CATEGORY_BREAKDOWN = (type: "INCOME" | "EXPENSE"): CategoryBreakdown => ({ type, total: "0.00", categories: [] });

export const getCategoryBreakdown = cache(
  async (businessId: string, type: "INCOME" | "EXPENSE", dateFrom?: string, dateTo?: string): Promise<CategoryBreakdown> => {
    const accessToken = await getAccessToken();
    if (!accessToken) return EMPTY_CATEGORY_BREAKDOWN(type);

    try {
      const response = await axios.get<CategoryBreakdown>(`${API_BASE_URL}/api/businesses/${businessId}/reports/category-breakdown`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { type, dateFrom, dateTo },
      });
      return response.data;
    } catch {
      return EMPTY_CATEGORY_BREAKDOWN(type);
    }
  },
);

export const getIncomeVsSavingsTrend = cache(async (businessId: string, months = 6): Promise<IncomeVsSavingsPoint[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await axios.get<IncomeVsSavingsPoint[]>(`${API_BASE_URL}/api/businesses/${businessId}/reports/income-vs-savings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { months },
    });
    return response.data;
  } catch {
    return [];
  }
});
