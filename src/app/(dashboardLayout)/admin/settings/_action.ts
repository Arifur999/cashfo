"use server";

import { runValidatedAction } from "@/lib/runAction";
import { updatePlatformSettings } from "@/services/settings.services";
import { updateSettingsServerZodSchema } from "@/zod/settings.validation";

export const updateSettingsAction = async (values: unknown) =>
  runValidatedAction(updateSettingsServerZodSchema, values, "Failed to update settings", updatePlatformSettings);
