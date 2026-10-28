"use server";

import { type AuthRefusal, toAuthRefusal } from "@/lib/authRefusal";
import { completeSignIn } from "@/lib/completeSignIn";
import { acceptAdminInvite, getInviteTwoStepSecret } from "@/services/accountAccess.services";
import { newPasswordSchema } from "@/zod/auth.validation";

// Joining the admin team from an invite link (AdminInviteAccept).

const tokenOf = (token: unknown) => (typeof token === "string" ? token.trim() : "");

// The key for the authenticator app, made once per link (a reload shows
// the same one).
export const getInviteTwoStepSecretAction = async (token: unknown): Promise<{ success: true; secret: string; otpauthUrl: string } | AuthRefusal> => {
  if (!tokenOf(token)) return { success: false, message: "This invite link is incomplete." };
  try {
    return { success: true, ...(await getInviteTwoStepSecret(tokenOf(token))) };
  } catch (error) {
    return toAuthRefusal(error, "Couldn't load the two-step key. Please try again.");
  }
};

// Creates the admin with their name, password and two-step on, and signs
// them in (the cookies are set here). The ten backup codes come back to be
// shown once; the page then opens `destination`.
export const acceptInviteAction = async (input: { token: unknown; name: unknown; password: unknown; code: unknown }): Promise<{ success: true; backupCodes: string[]; destination: string } | AuthRefusal> => {
  const token = tokenOf(input.token);
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const code = typeof input.code === "string" ? input.code.replace(/\s/g, "") : "";
  const password = newPasswordSchema.safeParse(input.password);
  if (!token) return { success: false, message: "This invite link is incomplete." };
  if (!name || name.length > 100) return { success: false, message: "Enter your name" };
  if (!password.success) return { success: false, message: password.error.issues[0]?.message ?? "Use at least one letter and one number" };
  if (!/^\d{6}$/.test(code)) return { success: false, message: "Enter the 6-digit code from your authenticator app." };

  try {
    const answer = await acceptAdminInvite({ token, name, password: password.data, code });
    const destination = await completeSignIn(answer);
    return { success: true, backupCodes: answer.backupCodes ?? [], destination };
  } catch (error) {
    return toAuthRefusal(error, "We couldn't finish joining. Please try again.");
  }
};
