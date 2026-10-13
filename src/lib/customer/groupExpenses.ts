// Server-only helpers, same shape as lib/receivablesPayables.ts.
import { cache } from "react";
import {
  API_BASE_URL,
  type GroupContribution,
  type GroupExpense,
  type GroupExpenseCategory,
  type GroupExpenseCategoryOption,
  type GroupMember,
  type GroupMonthlyBudget,
  type GroupSettlementRecord,
  type GroupSettlementResult,
} from "./api";
import { getAccessToken } from "@/lib/tokenUtils";
import { emptyUnlessOutage } from "./readFallback";
import { customerApi } from "./apiClient";

async function authHeaders() {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  return { Authorization: `Bearer ${accessToken}` };
}

export const getGroupMembers = cache(async (businessId: string): Promise<GroupMember[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<GroupMember[]>(`${API_BASE_URL}/api/businesses/${businessId}/group/members`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

export interface ContributionFilters {
  groupMemberId?: string;
  from?: string;
  to?: string;
}

export const getGroupContributions = cache(async (businessId: string, filters: ContributionFilters = {}): Promise<GroupContribution[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<GroupContribution[]>(`${API_BASE_URL}/api/businesses/${businessId}/group/contributions`, {
      headers,
      params: filters,
    });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

export interface ExpenseFilters {
  category?: GroupExpenseCategory;
  from?: string;
  to?: string;
}

export const getGroupExpenses = cache(async (businessId: string, filters: ExpenseFilters = {}): Promise<GroupExpense[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<GroupExpense[]>(`${API_BASE_URL}/api/businesses/${businessId}/group/expenses`, {
      headers,
      params: filters,
    });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

export const getGroupExpenseCategories = cache(async (businessId: string): Promise<GroupExpenseCategoryOption[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<GroupExpenseCategoryOption[]>(`${API_BASE_URL}/api/businesses/${businessId}/group/expenses/categories`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

const EMPTY_SETTLEMENT: GroupSettlementResult = {
  periodStart: new Date().toISOString(),
  periodEnd: new Date().toISOString(),
  totalExpense: "0.00",
  memberCount: 0,
  perMemberShare: "0.00",
  members: [],
};

export const getGroupSettlement = cache(async (businessId: string, from?: string, to?: string): Promise<GroupSettlementResult> => {
  const headers = await authHeaders();
  if (!headers) return EMPTY_SETTLEMENT;
  try {
    const res = await customerApi.get<GroupSettlementResult>(`${API_BASE_URL}/api/businesses/${businessId}/group/settlement`, {
      headers,
      params: from && to ? { from, to } : undefined,
    });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, EMPTY_SETTLEMENT);
  }
});

export const getGroupSettlementHistory = cache(async (businessId: string): Promise<GroupSettlementRecord[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<GroupSettlementRecord[]>(`${API_BASE_URL}/api/businesses/${businessId}/group/settlement/history`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

export const getGroupMonthBudgets = cache(async (businessId: string): Promise<GroupMonthlyBudget[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<GroupMonthlyBudget[]>(`${API_BASE_URL}/api/businesses/${businessId}/group/month-budgets`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});
