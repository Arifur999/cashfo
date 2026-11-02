import { z } from "zod";
import { DATE_TIME_INPUT_PATTERN, dateTimeInputToIso } from "@/lib/date";
import { MONEY_PATTERN } from "@/lib/validators";
import { PAYOUT_METHOD_TYPES, type IMarkPayoutPaidPayload, type IReferralSettingsPayload } from "@/types/referral.types";
import { reasonSchema } from "./common.validation";

// --- Mark a payout paid ---

const trxIdSchema = z.string().trim().min(1, "Enter the transaction ID").max(100, "At most 100 characters");
const noteSchema = z.string().trim().max(500, "At most 500 characters");
// The moment the money went, in the platform's time zone; never ahead of now
// (the API refuses a future date).
const paidAtSchema = z
  .string()
  .regex(DATE_TIME_INPUT_PATTERN, "Pick when it was sent")
  .refine((value) => new Date(dateTimeInputToIso(value)).getTime() <= Date.now() + 5 * 60_000, "Can't be in the future");

// A. Form schema -- built per request, since no more than the request can
// be sent. Amounts are strings while typed.
export const buildMarkPayoutPaidFormZodSchema = (maxAmount: number) =>
  z.object({
    trxId: trxIdSchema,
    paidAt: paidAtSchema,
    paidAmount: z
      .string()
      .regex(MONEY_PATTERN, "Enter an amount like 540 or 540.50")
      .refine((value) => Number(value) > 0, "Must be greater than zero")
      .refine((value) => Number(value) <= maxAmount, "More than this request"),
    notifyUser: z.boolean(),
    note: noteSchema,
  });

export type IMarkPayoutPaidFormValues = z.infer<ReturnType<typeof buildMarkPayoutPaidFormZodSchema>>;

// B. Server schema -- the API re-checks the amount against the request.
export const markPayoutPaidServerZodSchema = z
  .object({
    trxId: trxIdSchema,
    paidAt: paidAtSchema,
    paidAmount: z.string().regex(MONEY_PATTERN, "Enter an amount like 540 or 540.50"),
    notifyUser: z.boolean(),
    note: noteSchema,
  })
  .transform(
    (values): IMarkPayoutPaidPayload => ({
      trxId: values.trxId,
      paidAt: dateTimeInputToIso(values.paidAt),
      paidAmount: Number(values.paidAmount),
      notifyUser: values.notifyUser,
      ...(values.note ? { note: values.note } : {}),
    }),
  );

// Rejecting a request or cancelling a commission: the reason the member is
// shown (a payout) or the audit log keeps (a commission), 5 to 500 letters.
export const referralReasonServerZodSchema = z.object({ reason: reasonSchema.max(500, "At most 500 characters") });

// Approve: the lines unticked at review, held back for a second look.
export const approvePayoutServerZodSchema = z.object({ excludedIds: z.array(z.string().min(1).max(64)).max(500).default([]) });

// --- Settings ---

const wholeNumber = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, "A whole number")
    .refine((value) => Number(value) >= min && Number(value) <= max, message);

// A. Form schema: the numbers as typed. A blank monthly limit means none.
export const referralSettingsFormZodSchema = z.object({
  programLive: z.boolean(),
  whoCanEarn: z.enum(["PAID_PLAN", "EVERYONE"]),
  commissionPct: wholeNumber(0, 100, "From 0 to 100"),
  friendDiscountPct: wholeNumber(0, 100, "From 0 to 100"),
  holdDays: wholeNumber(0, 365, "From 0 to 365 days"),
  minWithdrawal: wholeNumber(1, 10_000_000, "At least 1"),
  withdrawalFee: wholeNumber(0, 10_000_000, "A whole number"),
  payWithinDays: wholeNumber(1, 60, "From 1 to 60 days"),
  payoutMethods: z.array(z.enum(PAYOUT_METHOD_TYPES)).min(1, "Pick at least one way to pay"),
  blockSelf: z.boolean(),
  cancelOnRefund: z.boolean(),
  flagSameNumber: z.boolean(),
  maxPerMonth: z
    .string()
    .trim()
    .regex(/^\d*$/, "A whole number, or blank for no limit")
    .refine((value) => value === "" || Number(value) >= 1, "At least 1, or blank for no limit"),
});

export type IReferralSettingsFormValues = z.infer<typeof referralSettingsFormZodSchema>;

// The fee is taken off what is sent, so it must stay under the smallest
// withdrawal (the API refuses it otherwise).
export const getFeeError = (withdrawalFee: string, minWithdrawal: string) =>
  minWithdrawal !== "" && withdrawalFee !== "" && Number(withdrawalFee) >= Number(minWithdrawal) ? "Must be less than the minimum" : undefined;

// B. Server schema: the same rules, as the API's numbers.
export const referralSettingsServerZodSchema = referralSettingsFormZodSchema
  .superRefine((values, ctx) => {
    const feeError = getFeeError(values.withdrawalFee, values.minWithdrawal);
    if (feeError) ctx.addIssue({ code: "custom", path: ["withdrawalFee"], message: feeError });
  })
  .transform(
    (values): IReferralSettingsPayload => ({
      programLive: values.programLive,
      whoCanEarn: values.whoCanEarn,
      commissionPct: Number(values.commissionPct),
      friendDiscountPct: Number(values.friendDiscountPct),
      holdDays: Number(values.holdDays),
      minWithdrawal: Number(values.minWithdrawal),
      withdrawalFee: Number(values.withdrawalFee),
      payWithinDays: Number(values.payWithinDays),
      payoutMethods: values.payoutMethods,
      blockSelf: values.blockSelf,
      cancelOnRefund: values.cancelOnRefund,
      flagSameNumber: values.flagSameNumber,
      maxPerMonth: values.maxPerMonth === "" ? null : Number(values.maxPerMonth),
    }),
  );
