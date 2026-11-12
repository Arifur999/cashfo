// Server-only helpers, same shape as lib/receivablesPayables.ts.
import { cache } from "react";
import {
  API_BASE_URL,
  type GroupActivityAction,
  type GroupActivityPage,
  type GroupCashbook,
  type GroupContribution,
  type GroupExpense,
  type GroupExpenseCategory,
  type GroupExpenseCategoryOption,
  type GroupMeal,
  type GroupMember,
  type GroupMonthlyBudget,
  type GroupSettings,
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
  mealExpense: "0.00",
  mealUnits: "0.00",
  mealRate: "0.0000",
  cashInHand: "0.00",
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

// A group's settings before any are saved.
export const DEFAULT_GROUP_SETTINGS: GroupSettings = { kind: "FAMILY", monthStartDay: 1, cashHolderMemberId: null, mealsOn: false, breakfastUnits: "0.50", lunchUnits: "1.00", dinnerUnits: "1.00" };

export const getGroupSettings = cache(async (businessId: string): Promise<GroupSettings> => {
  const headers = await authHeaders();
  if (!headers) return DEFAULT_GROUP_SETTINGS;
  try {
    const res = await customerApi.get<GroupSettings>(`${API_BASE_URL}/api/businesses/${businessId}/group/settings`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, DEFAULT_GROUP_SETTINGS);
  }
});

export const getGroupMeals = cache(async (businessId: string, from: string, to: string): Promise<GroupMeal[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<GroupMeal[]>(`${API_BASE_URL}/api/businesses/${businessId}/group/meals`, { headers, params: { from, to } });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});

const EMPTY_CASHBOOK: GroupCashbook = { accountants: [], cashHolderMemberId: null, opening: "0.00", closing: "0.00", totalIn: "0.00", totalOut: "0.00", inCount: 0, outCount: 0, rows: [] };

// An accountant's money in and out (every accountant's without one).
export const getGroupCashbook = cache(async (businessId: string, accountantId: string | undefined, from: string, to: string): Promise<GroupCashbook> => {
  const headers = await authHeaders();
  if (!headers) return EMPTY_CASHBOOK;
  try {
    const res = await customerApi.get<GroupCashbook>(`${API_BASE_URL}/api/businesses/${businessId}/group/cashbook`, { headers, params: { ...(accountantId && { accountantId }), from, to } });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, EMPTY_CASHBOOK);
  }
});

export const getGroupActivity = cache(async (businessId: string, action: GroupActivityAction | undefined, page: number, limit = 50): Promise<GroupActivityPage> => {
  const empty: GroupActivityPage = { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
  const headers = await authHeaders();
  if (!headers) return empty;
  try {
    const res = await customerApi.get<GroupActivityPage>(`${API_BASE_URL}/api/businesses/${businessId}/group/activity`, { headers, params: { ...(action && { action }), page, limit } });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, empty);
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

// What was spent in each of the group's months ("2026-11" → "33000.00"),
// by its own month start: the month picker's "Spent" line.
export const getGroupMonthTotals = cache(async (businessId: string): Promise<{ month: string; spent: string }[]> => {
  const headers = await authHeaders();
  if (!headers) return [];
  try {
    const res = await customerApi.get<{ month: string; spent: string }[]>(`${API_BASE_URL}/api/businesses/${businessId}/group/month-totals`, { headers });
    return res.data;
  } catch (error) {
    return emptyUnlessOutage(error, []);
  }
});
