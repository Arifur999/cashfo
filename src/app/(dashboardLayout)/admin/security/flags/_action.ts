"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { runSuspiciousActivityDetection, updateSecurityFlagStatus } from "@/services/security.services";
import { updateFlagStatusServerZodSchema } from "@/zod/securityFlag.validation";

export const updateFlagStatusAction = async (flagId: string, values: unknown) =>
  requireId(flagId, "flag") ??
  runValidatedAction(updateFlagStatusServerZodSchema, values, "Failed to update the flag", ({ status }) =>
    updateSecurityFlagStatus(flagId, status),
  );

export const runDetectionAction = async () => runAction("Failed to run detection", () => runSuspiciousActivityDetection());
