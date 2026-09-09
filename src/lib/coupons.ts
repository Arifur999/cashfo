import axios from "axios";
import { API_BASE_URL, type Coupon, type CouponRedemption } from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getCoupons(): Promise<Coupon[]> {
  const response = await axios.get<Coupon[]>(`${API_BASE_URL}/admin/coupons`, { headers: await authHeaders() });
  return response.data;
}

export async function getCouponRedemptions(id: string): Promise<CouponRedemption[]> {
  const response = await axios.get<CouponRedemption[]>(`${API_BASE_URL}/admin/coupons/${id}/redemptions`, {
    headers: await authHeaders(),
  });
  return response.data;
}
