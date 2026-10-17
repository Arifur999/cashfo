export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED_AMOUNT"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

// Computed by the backend from isActive, the validity window and the cap.
export const COUPON_STATUSES = ["ACTIVE", "SCHEDULED", "EXPIRED", "USED_UP", "DISABLED"] as const;
export type CouponStatus = (typeof COUPON_STATUSES)[number];

// The figures over the coupons list (this Dhaka month). Money is a
// fixed-2dp string.
export interface ICouponStats {
  active: { count: number; codes: string[] };
  usedThisMonth: number;
  paymentsThisMonth: number;
  moneyOffThisMonth: string;
  mostUsed: { code: string; times: number } | null;
}

// `discountValue` is a Decimal, so it arrives as a fixed-2dp string.
export interface ICoupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: string;
  maxRedemptions: number | null;
  timesRedeemed: number;
  validFrom: string;
  validUntil: string;
  // Plan ids; empty means the coupon applies to every plan.
  applicablePlans: string[];
  isActive: boolean;
  createdAt: string;
  status: CouponStatus;
}

export interface ICouponRedemption {
  id: string;
  couponId: string;
  platformUserId: string;
  planId: string;
  redeemedAt: string;
  plan: { id: string; name: string };
  platformUser: { id: string; name: string; email: string } | null;
}

export interface ICouponPayload {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  // null clears the cap (unlimited) on update.
  maxRedemptions?: number | null;
  validFrom: string;
  validUntil: string;
  applicablePlans: string[];
  isActive?: boolean;
}
