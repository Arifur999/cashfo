"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { createCoupon, deleteCoupon, updateCoupon } from "@/services/coupon.services";
import { createCouponServerZodSchema, updateCouponServerZodSchema } from "@/zod/coupon.validation";

export const createCouponAction = async (values: unknown) =>
  runValidatedAction(createCouponServerZodSchema, values, "Failed to create coupon", createCoupon);

export const updateCouponAction = async (id: string, values: unknown) =>
  requireId(id, "coupon") ??
  runValidatedAction(updateCouponServerZodSchema, values, "Failed to update coupon", (payload) => updateCoupon(id, payload));

// The API refuses once a coupon has been redeemed.
export const deleteCouponAction = async (id: string) =>
  requireId(id, "coupon") ?? runAction("Failed to delete coupon", () => deleteCoupon(id));
