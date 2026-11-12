// Server-only helpers, same shape as lib/budgets.ts.
import { cache } from "react";
import {
  API_BASE_URL,
  type SavingsAccountOverview,
  type SavingsGoal,
  type SavingsGoalDetail,
  type SavingsGoalStatus,
  type SavingsPlan,
  type SavingsTransferRow,
  type SavingsWalletGoals,
} from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";

export const getSavingsGoals = cache(async (businessId: string, status?: SavingsGoalStatus): Promise<SavingsGoal[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await customerApi.get<SavingsGoal[]>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { status },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

const EMPTY_ACCOUNT_OVERVIEW: SavingsAccountOverview = { totalAccounts: 0, totalBalance: "0.00", inactiveAmount: "0.00", availableBalance: "0.00", accounts: [] };

export const getSavingsAccountOverview = cache(async (businessId: string): Promise<SavingsAccountOverview> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return EMPTY_ACCOUNT_OVERVIEW;

  try {
    const response = await customerApi.get<SavingsAccountOverview>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/account-overview`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, EMPTY_ACCOUNT_OVERVIEW);
  }
});

export const getSavingsTransfers = cache(async (businessId: string): Promise<SavingsTransferRow[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await customerApi.get<SavingsTransferRow[]>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/transfers`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

export const getSavingsGoal = cache(async (businessId: string, id: string): Promise<SavingsGoalDetail | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await customerApi.get<SavingsGoalDetail>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, null);
  }
});

// Which goals each savings wallet's money belongs to.
export const getSavingsWalletGoals = cache(async (businessId: string): Promise<SavingsWalletGoals[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await customerApi.get<SavingsWalletGoals[]>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/wallet-goals`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

// Saving plans: things to save for later.
export const getSavingsPlans = cache(async (businessId: string): Promise<SavingsPlan[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await customerApi.get<SavingsPlan[]>(`${API_BASE_URL}/api/businesses/${businessId}/savings-plans`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});
