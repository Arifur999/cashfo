import { z } from "zod";
import type { ICreateFeatureFlagPayload, IUpdateFeatureFlagPayload } from "@/types/featureFlag.types";

// "new_dashboard_ui": lowercase words joined by underscores.
export const FEATURE_FLAG_KEY_PATTERN = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

const rolloutSchema = z.number().int().min(0, "0 to 100").max(100, "0 to 100");

// A. Form schemas -- the rollout is a slider, so a number already.
export const featureFlagFormZodSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Enter a key")
    .max(60, "At most 60 characters")
    .regex(FEATURE_FLAG_KEY_PATTERN, "Lowercase words joined by underscores, e.g. new_dashboard_ui"),
  name: z.string().trim().min(1, "Give it a name").max(80, "At most 80 characters"),
  description: z.string().trim().max(300, "At most 300 characters"),
  isEnabled: z.boolean(),
  rolloutPercent: rolloutSchema,
  targetPlanIds: z.array(z.string()),
});

export type IFeatureFlagFormValues = z.infer<typeof featureFlagFormZodSchema>;

export const featureFlagRolloutFormZodSchema = z.object({ rolloutPercent: rolloutSchema, targetPlanIds: z.array(z.string()) });

export type IFeatureFlagRolloutFormValues = z.infer<typeof featureFlagRolloutFormZodSchema>;

// B. Server schemas.
export const featureFlagServerZodSchema = featureFlagFormZodSchema.transform(
  ({ description, ...values }): ICreateFeatureFlagPayload => (description ? { ...values, description } : values),
);

export const featureFlagUpdateServerZodSchema = z
  .object({ isEnabled: z.boolean().optional(), rolloutPercent: rolloutSchema.optional(), targetPlanIds: z.array(z.string()).optional() })
  .refine((values) => Object.values(values).some((value) => value !== undefined), "Nothing to update") satisfies z.ZodType<IUpdateFeatureFlagPayload>;
