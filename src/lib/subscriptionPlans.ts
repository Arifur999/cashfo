import axios from "axios";
import { API_BASE_URL, type PlanAnalytics, type SubscriptionPlan, type SubscriptionPlanDetail, type SubscriptionPlanOption } from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getSubscriptionPlanOptions(): Promise<SubscriptionPlanOption[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];
  try {
    const response = await axios.get<SubscriptionPlanOption[]>(`${API_BASE_URL}/admin/plans`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch {
    return [];
  }
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const response = await axios.get<SubscriptionPlan[]>(`${API_BASE_URL}/admin/plans`, { headers: await authHeaders() });
  return response.data;
}

export async function getSubscriptionPlanById(id: string): Promise<SubscriptionPlanDetail | null> {
  try {
    const response = await axios.get<SubscriptionPlanDetail>(`${API_BASE_URL}/admin/plans/${id}`, {
      headers: await authHeaders(),
    });
    return response.data;
  } catch {
    return null;
  }
}

export async function getPlanAnalytics(): Promise<PlanAnalytics | null> {
  try {
    const response = await axios.get<PlanAnalytics>(`${API_BASE_URL}/admin/plans/analytics`, {
      headers: await authHeaders(),
    });
    return response.data;
  } catch {
    return null;
  }
}
