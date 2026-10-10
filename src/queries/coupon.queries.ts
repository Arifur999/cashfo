import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getCouponRedemptions, getCoupons } from "@/services/coupon.services";

export const couponsQuery = () =>
  queryOptions({
    queryKey: queryKeys.coupons.list(),
    queryFn: () => getCoupons(),
  });

export const couponRedemptionsQuery = (couponId: string) =>
  queryOptions({
    queryKey: [...queryKeys.coupons.detail(couponId), "redemptions"] as const,
    queryFn: () => getCouponRedemptions(couponId),
  });
