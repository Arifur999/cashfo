"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage } from "@/lib/api";
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

export async function suspendUserAction(userId: string, reason: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/users/${userId}/suspend`, { reason }, { headers: await authHeaders() });
  }, "Failed to suspend user");
}

export async function activateUserAction(userId: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/users/${userId}/activate`, {}, { headers: await authHeaders() });
  }, "Failed to activate user");
}

export async function banUserAction(userId: string, reason: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/users/${userId}/ban`, { reason }, { headers: await authHeaders() });
  }, "Failed to ban user");
}

export async function resetPasswordAction(userId: string): Promise<ActionResult<{ tempPassword: string }>> {
  return callApi(async () => {
    const res = await axios.post<{ tempPassword: string }>(
      `${API_BASE_URL}/admin/users/${userId}/reset-password`,
      {},
      { headers: await authHeaders() },
    );
    return res.data;
  }, "Failed to reset password");
}

export async function impersonateUserAction(userId: string): Promise<ActionResult<{ token: string }>> {
  return callApi(async () => {
    const res = await axios.post<{ token: string }>(
      `${API_BASE_URL}/admin/users/${userId}/impersonate`,
      {},
      { headers: await authHeaders() },
    );
    return res.data;
  }, "Failed to start impersonation");
}

export async function changePlanAction(userId: string, newPlanId: string, reason: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(
      `${API_BASE_URL}/admin/users/${userId}/change-plan`,
      { newPlanId, reason },
      { headers: await authHeaders() },
    );
  }, "Failed to change plan");
}
