"use server";

import { type AuthRefusal, toAuthRefusal } from "@/lib/authRefusal";
import { resetAdminPassword } from "@/services/accountAccess.services";
import { newPasswordSchema } from "@/zod/auth.validation";

// An admin's emailed reset (AdminForgotPassword): the new password, then
// they sign in again -- the reset signs them out everywhere and two-step
// still applies.
export const resetAdminPasswordAction = async (input: { token: unknown; password: unknown }): Promise<{ success: true } | AuthRefusal> => {
  const token = typeof input.token === "string" ? input.token.trim() : "";
  const password = newPasswordSchema.safeParse(input.password);
  if (!token) return { success: false, message: "This reset link is incomplete. Request a new one." };
  if (!password.success) return { success: false, message: password.error.issues[0]?.message ?? "Use at least one letter and one number" };
  try {
    await resetAdminPassword({ token, password: password.data });
    return { success: true };
  } catch (error) {
    return toAuthRefusal(error, "We couldn't save your new password. Please try again.");
  }
};
