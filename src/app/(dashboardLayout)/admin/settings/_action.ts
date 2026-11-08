"use server";

import { runValidatedAction } from "@/lib/runAction";
import { addHelpVideo, deleteHelpVideo, orderHelpVideos, updateHelpCompany, updateHelpVideo } from "@/services/help.services";
import { updatePlatformSettings } from "@/services/settings.services";
import { updateZakatPrices } from "@/services/zakat.services";
import { helpVideoIdServerZodSchema, helpVideoServerZodSchema, orderHelpVideosServerZodSchema, updateHelpCompanyServerZodSchema, updateHelpVideoServerZodSchema } from "@/zod/help.validation";
import { updateSettingsServerZodSchema } from "@/zod/settings.validation";
import { updateZakatPricesServerZodSchema } from "@/zod/zakat.validation";

export const updateSettingsAction = async (values: unknown) =>
  runValidatedAction(updateSettingsServerZodSchema, values, "Failed to update settings", updatePlatformSettings);

export const updateZakatPricesAction = async (values: unknown) =>
  runValidatedAction(updateZakatPricesServerZodSchema, values, "Couldn't save the zakat prices", updateZakatPrices);

// The Help page: the company card and the video guides.
export const updateHelpCompanyAction = async (values: unknown) => runValidatedAction(updateHelpCompanyServerZodSchema, values, "Couldn't save the company card", updateHelpCompany);

export const addHelpVideoAction = async (values: unknown) => runValidatedAction(helpVideoServerZodSchema, values, "Couldn't add the video", addHelpVideo);

export const updateHelpVideoAction = async (values: unknown) => runValidatedAction(updateHelpVideoServerZodSchema, values, "Couldn't save the video", updateHelpVideo);

export const deleteHelpVideoAction = async (values: unknown) => runValidatedAction(helpVideoIdServerZodSchema, values, "Couldn't delete the video", deleteHelpVideo);

export const orderHelpVideosAction = async (values: unknown) => runValidatedAction(orderHelpVideosServerZodSchema, values, "Couldn't save the order", orderHelpVideos);
