"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage } from "@/lib/api";
import type { AdminRole, FlagStatus, FullAdminUser, RunDetectionResult, SuspiciousActivityFlagRow } from "@/lib/api";
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

export async function updateFlagStatusAction(id: string, status: FlagStatus): Promise<ActionResult<SuspiciousActivityFlagRow>> {
  return callApi(async () => {
    const response = await axios.patch<SuspiciousActivityFlagRow>(
      `${API_BASE_URL}/admin/security/flags/${id}`,
      { status },
      { headers: await authHeaders() },
    );
    return response.data;
  }, "Failed to update flag");
}

export async function runDetectionAction(): Promise<ActionResult<RunDetectionResult>> {
  return callApi(async () => {
    const response = await axios.post<RunDetectionResult>(
      `${API_BASE_URL}/admin/security/flags/run-detection`,
      {},
      { headers: await authHeaders() },
    );
    return response.data;
  }, "Failed to run detection");
}

export interface CreateAdminInput {
  name: string;
  email: string;
  role: AdminRole;
}

export async function createAdminAction(input: CreateAdminInput): Promise<ActionResult<FullAdminUser & { temporaryPassword: string }>> {
  return callApi(async () => {
    const response = await axios.post<FullAdminUser & { temporaryPassword: string }>(`${API_BASE_URL}/admin/admins`, input, {
      headers: await authHeaders(),
    });
    return response.data;
  }, "Failed to create admin");
}

export async function updateAdminAction(id: string, updates: { name?: string; role?: AdminRole }): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/admins/${id}`, updates, { headers: await authHeaders() });
  }, "Failed to update admin");
}

export async function suspendAdminAction(id: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/admins/${id}/suspend`, {}, { headers: await authHeaders() });
  }, "Failed to suspend admin");
}

export async function resetAdminPasswordAction(id: string): Promise<ActionResult<{ temporaryPassword: string }>> {
  return callApi(async () => {
    const response = await axios.post<{ temporaryPassword: string }>(
      `${API_BASE_URL}/admin/admins/${id}/reset-password`,
      {},
      { headers: await authHeaders() },
    );
    return response.data;
  }, "Failed to reset password");
}
