"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { cancelCampaign, createCampaign } from "@/services/notification.services";
import { campaignServerZodSchema } from "@/zod/notification.validation";

export const createCampaignAction = async (values: unknown) =>
  runValidatedAction(campaignServerZodSchema, values, "Failed to create the campaign", (payload) => createCampaign(payload));

export const cancelCampaignAction = async (campaignId: string) =>
  requireId(campaignId, "campaign") ?? runAction("Failed to cancel the campaign", () => cancelCampaign(campaignId));
