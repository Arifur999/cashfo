// Server-only helpers, same shape as lib/budgets.ts.
import axios from "axios";
import { cache } from "react";
import {
  API_BASE_URL,
  type SavingsAccountOverview,
  type SavingsGoal,
  type SavingsGoalDetail,
  type SavingsGoalStatus,
  type SavingsOverview,
  type SavingsTransferRow,
} from "./api";
import { getAccessToken } from "./tokenCookies";

export const getSavingsGoals = cache(async (businessId: string, status?: SavingsGoalStatus): Promise<SavingsGoal[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await axios.get<SavingsGoal[]>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { status },
    });
    return response.data;
  } catch {
    return [];
  }
});

const EMPTY_OVERVIEW: SavingsOverview = {
  totalSaved: "0.00",
  totalGoals: "0.00",
  remaining: "0.00",
  progressPercent: 0,
  monthlyTarget: "0.00",
  savedThisMonth: "0.00",
  monthlyProgressPercent: 0,
  savingsRatePercent: 0,
};

export const getSavingsOverview = cache(async (businessId: string): Promise<SavingsOverview> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return EMPTY_OVERVIEW;

  try {
    const response = await axios.get<SavingsOverview>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/overview`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return EMPTY_OVERVIEW;
  }
});

const EMPTY_ACCOUNT_OVERVIEW: SavingsAccountOverview = { totalAccounts: 0, totalBalance: "0.00", inactiveAmount: "0.00", availableBalance: "0.00", accounts: [] };

export const getSavingsAccountOverview = cache(async (businessId: string): Promise<SavingsAccountOverview> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return EMPTY_ACCOUNT_OVERVIEW;

  try {
    const response = await axios.get<SavingsAccountOverview>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/account-overview`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return EMPTY_ACCOUNT_OVERVIEW;
  }
});

export const getSavingsTransfers = cache(async (businessId: string): Promise<SavingsTransferRow[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await axios.get<SavingsTransferRow[]>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/transfers`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return [];
  }
});

export const getSavingsGoal = cache(async (businessId: string, id: string): Promise<SavingsGoalDetail | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await axios.get<SavingsGoalDetail>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return null;
  }
});
