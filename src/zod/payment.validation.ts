import { z } from "zod";
import { DATE_TIME_INPUT_PATTERN, dateTimeInputToIso } from "@/lib/date";
import { MONEY_PATTERN } from "@/lib/validators";
import type { IMarkPaymentPaidPayload, IRefundPayload } from "@/types/payment.types";
import { reasonSchema } from "./common.validation";

// A. Form schema -- built per payment, since a refund can't exceed what was
// actually paid. The ceiling's message is a fixed key, so it reads in
// Bangla too; the field's own "Up to {amount}." says where the ceiling is.
export const buildRefundFormZodSchema = (maxAmount: number) =>
  z.object({
    amount: z
      .string()
      .regex(MONEY_PATTERN, "Enter an amount like 499 or 499.50")
      .refine((value) => Number(value) > 0, "Must be greater than zero")
      .refine((value) => Number(value) <= maxAmount, "More than this payment"),
    reason: reasonSchema,
  });

export type IRefundFormValues = z.infer<ReturnType<typeof buildRefundFormZodSchema>>;

// B. Server schema -- the API re-checks the amount against the payment.
export const refundServerZodSchema = z.object({
  amount: z.coerce.number().positive("Must be greater than zero"),
  reason: reasonSchema,
}) satisfies z.ZodType<IRefundPayload>;

// --- Mark paid / Mark failed (a customer's checkout, confirmed by hand) ---

// A. Form schema: what the gateway's statement says. The time is the
// platform's, never ahead of now (the API refuses a future one).
export const markPaymentPaidFormZodSchema = z.object({
  gatewayReferenceId: z.string().trim().min(1, "Enter the transaction ID").max(100, "At most 100 characters"),
  paidAt: z
    .string()
    .regex(DATE_TIME_INPUT_PATTERN, "Pick when the money arrived")
    .refine((value) => new Date(dateTimeInputToIso(value)).getTime() <= Date.now() + 5 * 60_000, "Can't be in the future"),
  payerAccount: z.string().trim().max(40, "At most 40 characters"),
  note: z.string().trim().max(500, "At most 500 characters"),
});

export type IMarkPaymentPaidFormValues = z.infer<typeof markPaymentPaidFormZodSchema>;

// B. Server schema: the API's body, empty optional fields left out.
export const markPaymentPaidServerZodSchema = markPaymentPaidFormZodSchema.transform(
  (values): IMarkPaymentPaidPayload => ({
    gatewayReferenceId: values.gatewayReferenceId,
    paidAt: dateTimeInputToIso(values.paidAt),
    ...(values.payerAccount ? { payerAccount: values.payerAccount } : {}),
    ...(values.note ? { note: values.note } : {}),
  }),
);

// Mark failed: why, 5 to 500 letters (the customer is told it).
export const markPaymentFailedServerZodSchema = z.object({ reason: reasonSchema.max(500, "At most 500 characters") });
