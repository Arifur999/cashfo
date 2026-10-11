"use server";

import { requireId, runValidatedAction } from "@/lib/runAction";
import { updateFeatureRequestStatus } from "@/services/featureRequest.services";
import { updateFeatureRequestStatusServerZodSchema } from "@/zod/featureRequest.validation";

export const updateFeatureRequestStatusAction = async (requestId: string, values: unknown) =>
  requireId(requestId, "feature request") ??
  runValidatedAction(updateFeatureRequestStatusServerZodSchema, values, "Failed to update feature request", ({ status }) =>
    updateFeatureRequestStatus(requestId, status),
  );
