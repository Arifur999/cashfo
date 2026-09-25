"use server";

import axios from "axios";
import {
  API_BASE_URL,
  getApiErrorMessage,
  type GroupContribution,
  type GroupExpense,
  type GroupExpenseCategory,
  type GroupMember,
  type GroupMemberStatus,
  type GroupSettlementRecord,
} from "./api";
import { getAccessToken } from "./tokenCookies";

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

// ---- Members ----

export async function createGroupMemberAction(businessId: string, input: { name: string; phone?: string }): Promise<ActionResult<GroupMember>> {
  return callApi(async () => {
    const res = await axios.post<GroupMember>(`${API_BASE_URL}/api/businesses/${businessId}/group/members`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to add member");
}

export async function updateGroupMemberAction(
  businessId: string,
  memberId: string,
  input: { name?: string; phone?: string; status?: GroupMemberStatus },
): Promise<ActionResult<GroupMember>> {
  return callApi(async () => {
    const res = await axios.patch<GroupMember>(`${API_BASE_URL}/api/businesses/${businessId}/group/members/${memberId}`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to update member");
}

export async function deleteGroupMemberAction(businessId: string, memberId: string): Promise<ActionResult<{ id: string; action: "deleted" | "archived" }>> {
  return callApi(async () => {
    const res = await axios.delete<{ id: string; action: "deleted" | "archived" }>(`${API_BASE_URL}/api/businesses/${businessId}/group/members/${memberId}`, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to remove member");
}

// ---- Contributions ----

export async function createGroupContributionAction(
  businessId: string,
  input: { groupMemberId: string; amount: string; date: string; note?: string },
): Promise<ActionResult<GroupContribution>> {
  return callApi(async () => {
    const res = await axios.post<GroupContribution>(`${API_BASE_URL}/api/businesses/${businessId}/group/contributions`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to add contribution");
}

export async function updateGroupContributionAction(
  businessId: string,
  id: string,
  input: { groupMemberId?: string; amount?: string; date?: string; note?: string },
): Promise<ActionResult<GroupContribution>> {
  return callApi(async () => {
    const res = await axios.patch<GroupContribution>(`${API_BASE_URL}/api/businesses/${businessId}/group/contributions/${id}`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to update contribution");
}

export async function deleteGroupContributionAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.delete(`${API_BASE_URL}/api/businesses/${businessId}/group/contributions/${id}`, { headers: await authHeaders() });
  }, "Failed to remove contribution");
}

// ---- Expenses ----

export async function createGroupExpenseAction(
  businessId: string,
  input: { amount: string; date: string; category?: GroupExpenseCategory; description?: string; paidByMemberId?: string },
): Promise<ActionResult<GroupExpense>> {
  return callApi(async () => {
    const res = await axios.post<GroupExpense>(`${API_BASE_URL}/api/businesses/${businessId}/group/expenses`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to add expense");
}

export async function updateGroupExpenseAction(
  businessId: string,
  id: string,
  input: { amount?: string; date?: string; category?: GroupExpenseCategory; description?: string; paidByMemberId?: string },
): Promise<ActionResult<GroupExpense>> {
  return callApi(async () => {
    const res = await axios.patch<GroupExpense>(`${API_BASE_URL}/api/businesses/${businessId}/group/expenses/${id}`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to update expense");
}

export async function deleteGroupExpenseAction(businessId: string, id: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.delete(`${API_BASE_URL}/api/businesses/${businessId}/group/expenses/${id}`, { headers: await authHeaders() });
  }, "Failed to remove expense");
}

// ---- Settlement ----

export async function closeGroupSettlementAction(
  businessId: string,
  input: { periodStart: string; periodEnd: string },
): Promise<ActionResult<GroupSettlementRecord>> {
  return callApi(async () => {
    const res = await axios.post<GroupSettlementRecord>(`${API_BASE_URL}/api/businesses/${businessId}/group/settlement/close`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to close settlement");
}
