"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage } from "@/lib/api";
import type { ErrorLogRow, FeatureFlagRow } from "@/lib/api";
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

export interface UpdateFeatureFlagInput {
  isEnabled?: boolean;
  rolloutPercent?: number;
  targetPlanIds?: string[];
}

export async function updateFeatureFlagAction(id: string, updates: UpdateFeatureFlagInput): Promise<ActionResult<FeatureFlagRow>> {
  return callApi(async () => {
    const response = await axios.patch<FeatureFlagRow>(`${API_BASE_URL}/admin/system/feature-flags/${id}`, updates, {
      headers: await authHeaders(),
    });
    return response.data;
  }, "Failed to update feature flag");
}

export async function resolveErrorAction(id: string): Promise<ActionResult<ErrorLogRow>> {
  return callApi(async () => {
    const response = await axios.patch<ErrorLogRow>(
      `${API_BASE_URL}/admin/system/errors/${id}/resolve`,
      {},
      { headers: await authHeaders() },
    );
    return response.data;
  }, "Failed to resolve error");
}
