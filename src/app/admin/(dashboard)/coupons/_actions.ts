"use server";

import axios from "axios";
import { API_BASE_URL, getApiErrorMessage, type Coupon, type CouponRedemption, type DiscountType } from "@/lib/api";
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

export interface CouponFormInput {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxRedemptions?: number;
  validFrom: string;
  validUntil: string;
  applicablePlans: string[];
}

export async function createCouponAction(input: CouponFormInput): Promise<ActionResult<Coupon>> {
  return callApi(async () => {
    const res = await axios.post<Coupon>(`${API_BASE_URL}/admin/coupons`, input, { headers: await authHeaders() });
    return res.data;
  }, "Failed to create coupon");
}

export async function toggleCouponActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  return callApi(async () => {
    await axios.patch(`${API_BASE_URL}/admin/coupons/${id}`, { isActive }, { headers: await authHeaders() });
  }, "Failed to update coupon");
}

export async function getCouponRedemptionsAction(id: string): Promise<CouponRedemption[]> {
  try {
    const res = await axios.get<CouponRedemption[]>(`${API_BASE_URL}/admin/coupons/${id}/redemptions`, {
      headers: await authHeaders(),
    });
    return res.data;
  } catch {
    return [];
  }
}
