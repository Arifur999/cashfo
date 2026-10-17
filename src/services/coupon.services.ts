"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { ICoupon, ICouponPayload, ICouponRedemption, ICouponStats } from "@/types/coupon.types";

export const getCoupons = async () => httpClient.get<ICoupon[]>("/admin/coupons");

export const getCouponStats = async () => httpClient.get<ICouponStats>("/admin/coupons/stats");

export const getCouponRedemptions = async (id: string) => httpClient.get<ICouponRedemption[]>(`/admin/coupons/${id}/redemptions`);

export const createCoupon = async (payload: ICouponPayload) => httpClient.post<ICoupon>("/admin/coupons", payload);

export const updateCoupon = async (id: string, payload: Partial<ICouponPayload>) =>
  httpClient.patch<ICoupon>(`/admin/coupons/${id}`, payload);

// The API refuses once a coupon has been redeemed.
export const deleteCoupon = async (id: string) => httpClient.delete<void>(`/admin/coupons/${id}`);
