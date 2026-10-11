import { addDays } from "date-fns";
import { toDateInputValue } from "@/lib/date";
import type { ICoupon } from "@/types/coupon.types";
import type { ICouponFormValues } from "@/zod/coupon.validation";

// `today` is passed in (from the event that opens the dialog) rather than
// read here, so rendering stays pure.
export const getNewCouponDefaults = (today: Date): ICouponFormValues => ({
  code: "",
  discountType: "PERCENTAGE",
  discountValue: "10",
  maxRedemptions: "",
  validFrom: toDateInputValue(today),
  validUntil: toDateInputValue(addDays(today, 30)),
  applicablePlans: [],
  isActive: true,
});

// API coupon -> form values.
export const toCouponFormValues = (coupon: ICoupon): ICouponFormValues => ({
  code: coupon.code,
  discountType: coupon.discountType,
  discountValue: String(Number(coupon.discountValue)),
  maxRedemptions: coupon.maxRedemptions === null ? "" : String(coupon.maxRedemptions),
  validFrom: toDateInputValue(coupon.validFrom),
  validUntil: toDateInputValue(coupon.validUntil),
  applicablePlans: coupon.applicablePlans,
  isActive: coupon.isActive,
});
