import { z } from "zod";
import { isValidTimeZone, MONEY_PATTERN } from "@/lib/validators";
import type { IUpdatePlatformSettingsPayload } from "@/types/settings.types";

// A. Form schema -- input values as the form holds them (the reward amount
// is a string, since inputs produce strings).
export const updateSettingsFormZodSchema = z.object({
  platformName: z.string().trim().min(1, "Platform name is required"),
  supportEmail: z.email("Enter a valid email address"),
  defaultCurrency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Use a 3-letter ISO currency code, e.g. BDT"),
  defaultTimezone: z.string().trim().refine(isValidTimeZone, "Use an IANA timezone, e.g. Asia/Dhaka"),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string(),
  referralRewardAmount: z
    .string()
    .regex(MONEY_PATTERN, "Enter an amount like 50 or 49.99")
    .refine((value) => Number(value) > 0, "The reward must be greater than zero"),
});

export type IUpdateSettingsFormValues = z.infer<typeof updateSettingsFormZodSchema>;

// B. Server schema -- coerced to API types and re-validated in the action.
export const updateSettingsServerZodSchema = z
  .object({
    platformName: z.string().trim().min(1),
    supportEmail: z.string().trim().pipe(z.email()),
    defaultCurrency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/)
      .transform((value) => value.toUpperCase()),
    defaultTimezone: z.string().trim().refine(isValidTimeZone, "Unknown timezone"),
    maintenanceMode: z.boolean(),
    maintenanceMessage: z.string().trim(),
    referralRewardAmount: z.coerce.number().positive("The reward must be greater than zero"),
  })
  .partial() satisfies z.ZodType<IUpdatePlatformSettingsPayload>;
