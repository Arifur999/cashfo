"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import {
  activateAdminAccount,
  createAdminAccount,
  createAdminInvite,
  disableAdminTwoStep,
  resendAdminInvite,
  resetAdminPassword,
  revokeAdminInvite,
  suspendAdminAccount,
  updateAdminAccount,
} from "@/services/adminAccount.services";
import { getUserInfo } from "@/services/auth.services";
import { updatePlatformSettings } from "@/services/settings.services";
import { createAdminServerZodSchema, inviteAdminServerZodSchema, twoStepRuleServerZodSchema, updateAdminServerZodSchema } from "@/zod/adminAccount.validation";

// Answers with the account and its one-time temporary password: the
// invite drawer's "Set a first password instead", for when email isn't set up.
export const createAdminAction = async (values: unknown) =>
  runValidatedAction(createAdminServerZodSchema, values, "Failed to create the admin", (payload) => createAdminAccount(payload));

// Emails a one-time link that works for seven days.
export const inviteAdminAction = async (values: unknown) =>
  runValidatedAction(inviteAdminServerZodSchema, values, "Failed to send the invite", (payload) => createAdminInvite(payload));

export const resendInviteAction = async (inviteId: string) =>
  requireId(inviteId, "invite") ?? runAction("Failed to resend the invite", () => resendAdminInvite(inviteId));

export const revokeInviteAction = async (inviteId: string) =>
  requireId(inviteId, "invite") ?? runAction("Failed to cancel the invite", () => revokeAdminInvite(inviteId));

export const updateAdminAction = async (adminId: string, values: unknown) =>
  requireId(adminId, "admin") ??
  runValidatedAction(updateAdminServerZodSchema, values, "Failed to update the admin", async ({ name, role }) => {
    // The API refuses a self role change; editing yourself only renames.
    const currentAdmin = await getUserInfo();
    return updateAdminAccount(adminId, currentAdmin?.id === adminId ? { name } : { name, role });
  });

export const suspendAdminAction = async (adminId: string) =>
  requireId(adminId, "admin") ?? runAction("Failed to suspend the admin", () => suspendAdminAccount(adminId));

export const activateAdminAction = async (adminId: string) =>
  requireId(adminId, "admin") ?? runAction("Failed to reactivate the admin", () => activateAdminAccount(adminId));

// Answers with the new one-time temporary password.
export const resetAdminPasswordAction = async (adminId: string) =>
  requireId(adminId, "admin") ?? runAction("Failed to reset the password", () => resetAdminPassword(adminId));

// For an admin who lost their phone: they sign in with the password alone
// and set two-step up again (unless every admin must have it).
export const disableAdminTwoStepAction = async (adminId: string) =>
  requireId(adminId, "admin") ?? runAction("Failed to turn off two-step sign-in", () => disableAdminTwoStep(adminId));

// "Require it for everyone": every admin must use two-step sign-in.
export const setAdminTwoStepRequiredAction = async (values: unknown) =>
  runValidatedAction(twoStepRuleServerZodSchema, values, "Failed to change the two-step rule", (payload) => updatePlatformSettings(payload));
