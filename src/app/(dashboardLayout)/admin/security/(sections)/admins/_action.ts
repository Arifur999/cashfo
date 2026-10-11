"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { createAdminAccount, resetAdminPassword, suspendAdminAccount, updateAdminAccount } from "@/services/adminAccount.services";
import { getUserInfo } from "@/services/auth.services";
import { createAdminServerZodSchema, updateAdminServerZodSchema } from "@/zod/adminAccount.validation";

// Answers with the account and its one-time temporary password.
export const createAdminAction = async (values: unknown) =>
  runValidatedAction(createAdminServerZodSchema, values, "Failed to create the admin", (payload) => createAdminAccount(payload));

export const updateAdminAction = async (adminId: string, values: unknown) =>
  requireId(adminId, "admin") ??
  runValidatedAction(updateAdminServerZodSchema, values, "Failed to update the admin", async ({ name, role }) => {
    // The API refuses a self role change; editing yourself only renames.
    const currentAdmin = await getUserInfo();
    return updateAdminAccount(adminId, currentAdmin?.id === adminId ? { name } : { name, role });
  });

export const suspendAdminAction = async (adminId: string) =>
  requireId(adminId, "admin") ?? runAction("Failed to suspend the admin", () => suspendAdminAccount(adminId));

// Answers with the new one-time temporary password.
export const resetAdminPasswordAction = async (adminId: string) =>
  requireId(adminId, "admin") ?? runAction("Failed to reset the password", () => resetAdminPassword(adminId));
