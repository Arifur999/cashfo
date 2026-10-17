import { z } from "zod";
import { BILLING_CYCLES, type IPlanPayload } from "@/types/plan.types";

// Mirrors the backend DTOs: price is a whole BDT amount (@IsInt), and each
// of the three counts accepts -1 for "no limit".
const wholeNumberString = (message: string, min = 0) =>
  z
    .string()
    .trim()
    .regex(/^-?\d+$/, message)
    .refine((value) => Number(value) >= min, min === -1 ? "Use -1 for unlimited, or 0 and up" : `Must be ${min} or more`);

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// A. Form schema -- numeric inputs hold strings.
export const planFormZodSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  slug: z.string().trim().regex(SLUG_PATTERN, "Lowercase letters, numbers and single dashes only"),
  billingCycle: z.enum(BILLING_CYCLES, "Choose a billing cycle"),
  price: wholeNumberString("Enter a whole amount, e.g. 499"),
  trialDays: wholeNumberString("Enter whole days, e.g. 14"),
  isActive: z.boolean(),
  featureLimits: z.object({
    maxWorkspaces: wholeNumberString("Enter a whole number", -1),
    maxBusinessWorkspaces: wholeNumberString("Enter a whole number", -1),
    maxTransactionsPerMonth: wholeNumberString("Enter a whole number", -1),
    advancedReports: z.boolean(),
    pdfExport: z.boolean(),
    multiUser: z.boolean(),
    incomeGoalTracking: z.boolean(),
  }),
});

export type IPlanFormValues = z.infer<typeof planFormZodSchema>;

// B. Server schema -- coerced to the API payload and re-validated in the action.
export const planServerZodSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().regex(SLUG_PATTERN),
  billingCycle: z.enum(BILLING_CYCLES),
  price: z.coerce.number().int().min(0),
  trialDays: z.coerce.number().int().min(0),
  isActive: z.boolean().optional(),
  featureLimits: z.object({
    maxWorkspaces: z.coerce.number().int().min(-1),
    maxBusinessWorkspaces: z.coerce.number().int().min(-1),
    maxTransactionsPerMonth: z.coerce.number().int().min(-1),
    advancedReports: z.boolean(),
    pdfExport: z.boolean(),
    multiUser: z.boolean(),
    incomeGoalTracking: z.boolean(),
  }),
}) satisfies z.ZodType<IPlanPayload>;

// "Monthly Pro!" -> "monthly-pro"
export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
