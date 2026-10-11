import { z } from "zod";
import { MONEY_PATTERN } from "@/lib/validators";
import type { IRefundPayload } from "@/types/payment.types";
import { reasonSchema } from "./common.validation";

// A. Form schema -- built per payment, since a refund can't exceed what was
// actually paid.
export const buildRefundFormZodSchema = (maxAmount: number) =>
  z.object({
    amount: z
      .string()
      .regex(MONEY_PATTERN, "Enter an amount like 499 or 499.50")
      .refine((value) => Number(value) > 0, "Must be greater than zero")
      .refine((value) => Number(value) <= maxAmount, `Can't exceed the payment amount (${maxAmount})`),
    reason: reasonSchema,
  });

export type IRefundFormValues = z.infer<ReturnType<typeof buildRefundFormZodSchema>>;

// B. Server schema -- the API re-checks the amount against the payment.
export const refundServerZodSchema = z.object({
  amount: z.coerce.number().positive("Must be greater than zero"),
  reason: reasonSchema,
}) satisfies z.ZodType<IRefundPayload>;
