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

export async function suspendOwnerAction(userId: string, reason: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/owners/${userId}/suspend`, { reason }, { headers: await authHeaders() });
  }, "Failed to suspend owner");
}

export async function activateOwnerAction(userId: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/owners/${userId}/activate`, {}, { headers: await authHeaders() });
  }, "Failed to activate owner");
}

export async function changeOwnerPlanAction(userId: string, newPlanId: string, reason: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(
      `${API_BASE_URL}/admin/owners/${userId}/change-plan`,
      { newPlanId, reason },
      { headers: await authHeaders() },
    );
  }, "Failed to change plan");
}
