import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getCouponRedemptions, getCoupons, getCouponStats } from "@/services/coupon.services";

export const couponsQuery = () =>
  queryOptions({
    queryKey: queryKeys.coupons.list(),
    queryFn: () => getCoupons(),
  });

// Under coupons.all, so any coupon mutation's invalidation refreshes it too.
export const couponStatsQuery = () =>
  queryOptions({
    queryKey: [...queryKeys.coupons.all, "stats"] as const,
    queryFn: () => getCouponStats(),
  });

export const couponRedemptionsQuery = (couponId: string) =>
  queryOptions({
    queryKey: [...queryKeys.coupons.detail(couponId), "redemptions"] as const,
    queryFn: () => getCouponRedemptions(couponId),
  });
