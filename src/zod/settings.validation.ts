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

// Settings > Payment accounts: the numbers and the bank account Checkout
// shows. Empty turns a way off; a wallet number is 11 digits (Rocket's
// may have a 12th), dashes and spaces allowed.
const walletNumber = (message: string, rocket = false) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || (rocket ? /^01[3-9]\d{8}\d?$/ : /^01[3-9]\d{8}$/).test(value.replace(/[\s-]/g, "")), message);
export const paymentAccountsFormZodSchema = z.object({
  bkash: walletNumber("11 digits starting with 01"),
  nagad: walletNumber("11 digits starting with 01"),
  rocket: walletNumber("11 or 12 digits starting with 01", true),
  bankName: z.string().trim().max(80, "At most 80 characters"),
  branch: z.string().trim().max(80, "At most 80 characters"),
  accountName: z.string().trim().max(80, "At most 80 characters"),
  accountNumber: z.string().trim().regex(/^[0-9 -]{0,30}$/, "Digits only"),
  routingNumber: z.string().trim().refine((value) => value === "" || /^\d{9}$/.test(value.replace(/[\s-]/g, "")), "9 digits"),
});
export type IPaymentAccountsFormValues = z.infer<typeof paymentAccountsFormZodSchema>;

const digits = (value: string) => value.replace(/[\s-]/g, "");

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
    billingPaymentAccounts: z
      .object({
        bkash: z.string().trim().transform(digits).pipe(z.string().regex(/^(01[3-9]\d{8})?$/)),
        nagad: z.string().trim().transform(digits).pipe(z.string().regex(/^(01[3-9]\d{8})?$/)),
        rocket: z.string().trim().transform(digits).pipe(z.string().regex(/^(01[3-9]\d{8}\d?)?$/)),
        bank: z
          .object({
            bankName: z.string().trim().max(80),
            branch: z.string().trim().max(80),
            accountName: z.string().trim().max(80),
            accountNumber: z.string().trim().regex(/^[0-9 -]{0,30}$/),
            routingNumber: z.string().trim().transform(digits).pipe(z.string().regex(/^(\d{9})?$/)),
          })
          .strict(),
      })
      .strict(),
  })
  .partial()
  .strict() satisfies z.ZodType<IUpdatePlatformSettingsPayload>;
