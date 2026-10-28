import { z } from "zod";
import { isValidTimeZone } from "@/lib/validators";
import type { IUpdatePlatformSettingsPayload } from "@/types/settings.types";

// A. Form schemas -- input values as the forms hold them.
const MESSAGE_MAX = 1000;

export const generalSettingsFormZodSchema = z.object({
  platformName: z.string().trim().min(1, "Platform name is required"),
  supportEmail: z.email("Enter a valid email address"),
  defaultCurrency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Use a 3-letter ISO currency code, e.g. BDT"),
  defaultTimezone: z.string().trim().refine(isValidTimeZone, "Use an IANA timezone, e.g. Asia/Dhaka"),
});
export type IGeneralSettingsFormValues = z.infer<typeof generalSettingsFormZodSchema>;

// System > Maintenance mode: what the app shows, in English and Bangla.
export const maintenanceMessagesFormZodSchema = z.object({
  maintenanceMessage: z.string().trim().min(1, "Write what the app should say").max(MESSAGE_MAX, "At most 1,000 characters"),
  maintenanceMessageBn: z.string().trim().max(MESSAGE_MAX, "At most 1,000 characters"),
});
export type IMaintenanceMessagesFormValues = z.infer<typeof maintenanceMessagesFormZodSchema>;

// B. Server schema -- coerced to API types and re-validated in the action.
// Settings saves General, System switches maintenance and Security the
// admins' two-step rule, each sending only its own fields. The old flat
// referral reward is no longer changed here (Referrals & Payouts >
// Settings holds the commission rules).
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
    maintenanceMessage: z.string().trim().max(MESSAGE_MAX),
    maintenanceMessageBn: z.string().trim().max(MESSAGE_MAX),
    signupsOpen: z.boolean(),
    adminTwoStepRequired: z.boolean(),
  })
  .partial()
  .strict() satisfies z.ZodType<IUpdatePlatformSettingsPayload>;
