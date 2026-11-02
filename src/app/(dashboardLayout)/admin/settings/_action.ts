"use server";

import { runValidatedAction } from "@/lib/runAction";
import { updatePlatformSettings } from "@/services/settings.services";
import { updateZakatPrices } from "@/services/zakat.services";
import { updateSettingsServerZodSchema } from "@/zod/settings.validation";
import { updateZakatPricesServerZodSchema } from "@/zod/zakat.validation";

export const updateSettingsAction = async (values: unknown) =>
  runValidatedAction(updateSettingsServerZodSchema, values, "Failed to update settings", updatePlatformSettings);

export const updateZakatPricesAction = async (values: unknown) =>
  runValidatedAction(updateZakatPricesServerZodSchema, values, "Couldn't save the zakat prices", updateZakatPrices);
