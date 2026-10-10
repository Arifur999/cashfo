import { z } from "zod";
import { endOfDayIso, startOfDayIso } from "@/lib/date";
import { MONEY_PATTERN } from "@/lib/validators";
import { DISCOUNT_TYPES, type DiscountType, type ICouponPayload } from "@/types/coupon.types";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const COUPON_CODE_PATTERN = /^[A-Za-z0-9_-]+$/;

// A. Form schema -- per-field rules; amounts and dates are strings.
export const couponFormZodSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "At least 3 characters")
    .max(32, "At most 32 characters")
    .regex(COUPON_CODE_PATTERN, "Letters, numbers, dashes and underscores only"),
  discountType: z.enum(DISCOUNT_TYPES),
  discountValue: z
    .string()
    .regex(MONEY_PATTERN, "Enter an amount like 10 or 12.5")
    .refine((value) => Number(value) > 0, "Must be greater than zero"),
  maxRedemptions: z
    .string()
    .regex(/^\d*$/, "A whole number, or blank for unlimited")
    .refine((value) => value === "" || Number(value) >= 1, "At least 1, or blank for unlimited"),
  validFrom: z.string().regex(DAY_PATTERN, "Pick a start date"),
  validUntil: z.string().regex(DAY_PATTERN, "Pick an end date"),
  applicablePlans: z.array(z.string()),
  isActive: z.boolean(),
});

export type ICouponFormValues = z.infer<typeof couponFormZodSchema>;

// Cross-field rules, shared by the form's listen-to validators and the
// server schema so the two can't disagree.
export const getPercentageError = (discountType: DiscountType, discountValue: string) =>
  discountType === "PERCENTAGE" && Number(discountValue) > 100 ? "A percentage can't exceed 100" : undefined;

export const getValidityError = (validFrom: string, validUntil: string) =>
  validFrom && validUntil && validUntil < validFrom ? "Must be on or after the start date" : undefined;

const toCouponPayload = (values: ICouponFormValues): ICouponPayload => ({
  code: values.code.trim().toUpperCase(),
  discountType: values.discountType,
  discountValue: Number(values.discountValue),
  maxRedemptions: values.maxRedemptions === "" ? null : Number(values.maxRedemptions),
  // The window covers whole days in the platform timezone.
  validFrom: startOfDayIso(values.validFrom),
  validUntil: endOfDayIso(values.validUntil),
  applicablePlans: values.applicablePlans,
  isActive: values.isActive,
});

const withCrossFieldRules = couponFormZodSchema.superRefine((values, ctx) => {
  const percentageError = getPercentageError(values.discountType, values.discountValue);
  if (percentageError) {
    ctx.addIssue({ code: "custom", path: ["discountValue"], message: percentageError });
  }
  const validityError = getValidityError(values.validFrom, values.validUntil);
  if (validityError) {
    ctx.addIssue({ code: "custom", path: ["validUntil"], message: validityError });
  }
});

// B. Server schemas. Create omits isActive: CreateCouponDto doesn't accept
// it, and the API rejects unknown properties (forbidNonWhitelisted).
export const createCouponServerZodSchema = withCrossFieldRules.transform((values): ICouponPayload => {
  const payload = toCouponPayload(values);
  delete payload.isActive;
  return payload;
});

export const updateCouponServerZodSchema = withCrossFieldRules.transform(toCouponPayload);
