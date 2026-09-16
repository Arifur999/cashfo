"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type ReferralInfo } from "./api";
import { getAccessToken } from "./tokenCookies";
import type { ActionResult } from "./authActions";

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

export async function getReferralInfoAction(): Promise<ActionResult<ReferralInfo>> {
  return callApi(async () => {
    const res = await axios.get<ReferralInfo>(`${API_BASE_URL}/api/referrals`, { headers: await authHeaders() });
    return res.data;
  }, "Failed to load referral info");
}

export async function withdrawReferralEarningsAction(businessId: string, accountId: string): Promise<ActionResult<{ withdrawnAmount: string }>> {
  return callApi(async () => {
    const res = await axios.post<{ withdrawnAmount: string }>(
      `${API_BASE_URL}/api/businesses/${businessId}/referrals/withdraw`,
      { accountId },
      { headers: await authHeaders() },
    );
    return res.data;
  }, "Failed to withdraw earnings");
}
