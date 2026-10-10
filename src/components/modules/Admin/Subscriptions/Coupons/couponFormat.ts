import { formatCurrency } from "@/lib/currency";
import type { ICoupon } from "@/types/coupon.types";

// "20%" or "BDT 50.00"
export const formatDiscount = (coupon: Pick<ICoupon, "discountType" | "discountValue">) =>
  coupon.discountType === "PERCENTAGE" ? `${Number(coupon.discountValue)}%` : formatCurrency(coupon.discountValue);

// "3 / 100", or "3 / ∞" without a cap.
export const formatRedemptions = (coupon: Pick<ICoupon, "timesRedeemed" | "maxRedemptions">) =>
  `${coupon.timesRedeemed} / ${coupon.maxRedemptions ?? "∞"}`;
