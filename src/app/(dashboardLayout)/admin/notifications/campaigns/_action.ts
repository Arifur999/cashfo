"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { cancelCampaign, createCampaign, deleteCampaign, sendCampaign } from "@/services/notification.services";
import { campaignServerZodSchema } from "@/zod/notification.validation";

export const createCampaignAction = async (values: unknown) =>
  runValidatedAction(campaignServerZodSchema, values, "Failed to create the campaign", (payload) => createCampaign(payload));

// "Send now" from the drawer: the campaign is made, then sent, in one step.
export const createAndSendCampaignAction = async (values: unknown) =>
  runValidatedAction(campaignServerZodSchema, values, "Failed to send the campaign", async (payload) => {
    // Made with no time, so it waits as a draft until the send below.
    const created = await createCampaign({ ...payload, scheduledFor: undefined });
    return sendCampaign(created.data.id);
  });

// "Send now" for a draft or a scheduled campaign in the list.
export const sendCampaignAction = async (campaignId: string) =>
  requireId(campaignId, "campaign") ?? runAction("Failed to send the campaign", () => sendCampaign(campaignId));

export const deleteCampaignAction = async (campaignId: string) =>
  requireId(campaignId, "campaign") ?? runAction("Failed to delete the campaign", () => deleteCampaign(campaignId));

export const cancelCampaignAction = async (campaignId: string) =>
  requireId(campaignId, "campaign") ?? runAction("Failed to cancel the campaign", () => cancelCampaign(campaignId));
