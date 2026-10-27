"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { approvePayout, cancelReferral, markPayoutPaid, rejectPayout, updateReferralSettings } from "@/services/referral.services";
import { markPayoutPaidServerZodSchema, referralReasonServerZodSchema, referralSettingsServerZodSchema } from "@/zod/referral.validation";

export const approvePayoutAction = async (payoutId: string) =>
  requireId(payoutId, "payout") ?? runAction("Failed to approve the request", () => approvePayout(payoutId));

export const rejectPayoutAction = async (payoutId: string, values: unknown) =>
  requireId(payoutId, "payout") ??
  runValidatedAction(referralReasonServerZodSchema, values, "Failed to reject the request", ({ reason }) => rejectPayout(payoutId, reason));

export const markPayoutPaidAction = async (payoutId: string, values: unknown) =>
  requireId(payoutId, "payout") ??
  runValidatedAction(markPayoutPaidServerZodSchema, values, "Failed to mark the request paid", (payload) => markPayoutPaid(payoutId, payload));

export const cancelReferralAction = async (referralId: string, values: unknown) =>
  requireId(referralId, "referral") ??
  runValidatedAction(referralReasonServerZodSchema, values, "Failed to cancel the commission", ({ reason }) => cancelReferral(referralId, reason));

export const updateReferralSettingsAction = async (values: unknown) =>
  runValidatedAction(referralSettingsServerZodSchema, values, "Failed to save the referral settings", (payload) => updateReferralSettings(payload));
