"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { approvePayout, cancelCommission, markPayoutPaid, rejectPayout, releaseCommission, updateReferralSettings } from "@/services/referral.services";
import { approvePayoutServerZodSchema, markPayoutPaidServerZodSchema, referralReasonServerZodSchema, referralSettingsServerZodSchema } from "@/zod/referral.validation";

export const approvePayoutAction = async (payoutId: string, values: unknown) =>
  requireId(payoutId, "payout") ??
  runValidatedAction(approvePayoutServerZodSchema, values, "Failed to approve the request", ({ excludedIds }) => approvePayout(payoutId, excludedIds));

export const rejectPayoutAction = async (payoutId: string, values: unknown) =>
  requireId(payoutId, "payout") ??
  runValidatedAction(referralReasonServerZodSchema, values, "Failed to reject the request", ({ reason }) => rejectPayout(payoutId, reason));

export const markPayoutPaidAction = async (payoutId: string, values: unknown) =>
  requireId(payoutId, "payout") ??
  runValidatedAction(markPayoutPaidServerZodSchema, values, "Failed to mark the request paid", (payload) => markPayoutPaid(payoutId, payload));

export const cancelCommissionAction = async (commissionId: string, values: unknown) =>
  requireId(commissionId, "commission") ??
  runValidatedAction(referralReasonServerZodSchema, values, "Failed to cancel the commission", ({ reason }) => cancelCommission(commissionId, reason));

export const releaseCommissionAction = async (commissionId: string) =>
  requireId(commissionId, "commission") ?? runAction("Failed to release the commission", () => releaseCommission(commissionId));

export const updateReferralSettingsAction = async (values: unknown) =>
  runValidatedAction(referralSettingsServerZodSchema, values, "Failed to save the referral settings", (payload) => updateReferralSettings(payload));
