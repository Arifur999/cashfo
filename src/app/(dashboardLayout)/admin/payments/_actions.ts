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

export async function refundPaymentAction(paymentId: string, amount: number, reason: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.post(`${API_BASE_URL}/admin/payments/${paymentId}/refund`, { amount, reason }, { headers: await authHeaders() });
  }, "Failed to refund payment");
}

export async function retryPaymentAction(paymentId: string): Promise<ActionResult> {
  return callApi(async () => {
    await axios.post(`${API_BASE_URL}/admin/payments/${paymentId}/retry`, {}, { headers: await authHeaders() });
  }, "Failed to retry payment");
}
