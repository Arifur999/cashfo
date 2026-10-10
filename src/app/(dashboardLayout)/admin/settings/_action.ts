"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage } from "@/lib/api";
import type { PlatformSettings } from "@/lib/api";
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

export async function updateSettingsAction(updates: Partial<PlatformSettings>): Promise<ActionResult<PlatformSettings>> {
  try {
    const response = await axios.patch<PlatformSettings>(`${API_BASE_URL}/admin/settings`, updates, {
      headers: await authHeaders(),
    });
    return { success: true, data: response.data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { success: false, message: getApiErrorMessage(error.response?.data, "Failed to update settings") };
    }
    return { success: false, message: "Failed to update settings" };
  }
}
