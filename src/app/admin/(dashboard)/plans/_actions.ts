"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type FeatureLimits, type BillingCycle, type SubscriptionPlan } from "@/lib/api";
import { getAccessToken } from "@/lib/tokenCookies";

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

export interface PlanFormInput {
  name: string;
  slug: string;
  billingCycle: BillingCycle;
  price: number;
  trialDays: number;
  featureLimits: FeatureLimits;
  isActive?: boolean;
}

export async function createPlanAction(input: PlanFormInput): Promise<ActionResult<SubscriptionPlan>> {
  return callApi(async () => {
    const res = await axios.post<SubscriptionPlan>(`${API_BASE_URL}/admin/plans`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create plan");
}

export async function updatePlanAction(id: string, input: Partial<PlanFormInput>): Promise<ActionResult<SubscriptionPlan>> {
  return callApi(async () => {
    const res = await axios.patch<SubscriptionPlan>(`${API_BASE_URL}/admin/plans/${id}`, input, {
      headers: await authHeaders(),
    });
    return res.data;
  }, "Failed to update plan");
}

export async function archivePlanAction(id: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/plans/${id}/archive`, {}, { headers: await authHeaders() });
  }, "Failed to archive plan");
}

export async function deletePlanAction(id: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.delete(`${API_BASE_URL}/admin/plans/${id}`, { headers: await authHeaders() });
  }, "Failed to delete plan");
}
