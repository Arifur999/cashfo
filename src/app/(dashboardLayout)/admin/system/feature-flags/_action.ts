"use server";

import { requireId, runValidatedAction } from "@/lib/runAction";
import { createFeatureFlag, updateFeatureFlag } from "@/services/featureFlag.services";
import { featureFlagServerZodSchema, featureFlagUpdateServerZodSchema } from "@/zod/featureFlag.validation";

export const createFeatureFlagAction = async (values: unknown) =>
  runValidatedAction(featureFlagServerZodSchema, values, "Failed to create the flag", (payload) => createFeatureFlag(payload));

// Any of { isEnabled, rolloutPercent, targetPlanIds }.
export const updateFeatureFlagAction = async (flagId: string, values: unknown) =>
  requireId(flagId, "feature flag") ??
  runValidatedAction(featureFlagUpdateServerZodSchema, values, "Failed to update the flag", (payload) => updateFeatureFlag(flagId, payload));
