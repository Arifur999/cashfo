import { z } from "zod";

// The audit-trail reason every destructive admin action requires (suspend,
// change plan, refund, ...). The backend enforces the same 5-character
// minimum (@MinLength(5)).
export const REASON_MIN_LENGTH = 5;

export const reasonSchema = z
  .string()
  .trim()
  .min(REASON_MIN_LENGTH, `Explain why (at least ${REASON_MIN_LENGTH} characters)`);

export const reasonFormZodSchema = z.object({ reason: reasonSchema });

export type IReasonFormValues = z.infer<typeof reasonFormZodSchema>;

// Turns "" into undefined so an untouched optional field isn't sent as an
// empty string the API would then store.
export const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
