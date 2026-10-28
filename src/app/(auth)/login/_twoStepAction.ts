"use server";

import { redirect } from "next/navigation";
import { type AuthRefusal, toAuthRefusal } from "@/lib/authRefusal";
import { completeSignIn } from "@/lib/completeSignIn";
import { clearSignInStep, getSignInStep } from "@/lib/tokenUtils";
import { answerTwoStep, enableTwoStepWithToken, startTwoStepSetupWithToken } from "@/services/auth.services";

// The second step of a sign-in (AdminTwoFactor), for admins and customers
// alike, on whichever page began it (sign-in, Google, a password reset). The
// API's one-time token waits in an httpOnly cookie (lib/tokenUtils.ts
// SignInStep); these actions are the only ones that read it.

// ("use server" files export only actions.)
const STEP_EXPIRED_MESSAGE = "This sign-in has timed out. Please sign in again.";

// The step can't go on: back to the sign-in form, saying why.
const ENDED_REASONS = new Set(["CHALLENGE_EXPIRED", "TOO_MANY_ATTEMPTS"]);

const expired = (): AuthRefusal => ({ success: false, message: STEP_EXPIRED_MESSAGE, reason: "CHALLENGE_EXPIRED" });

// The code (or a backup code). Resolves only on failure: success signs in
// and redirects where the sign-in was headed.
export const submitTwoStepCodeAction = async (input: { code?: string; backupCode?: string; trustDevice?: boolean }): Promise<AuthRefusal> => {
  const step = await getSignInStep();
  if (!step || step.kind !== "code") return expired();
  const code = typeof input.code === "string" ? input.code.replace(/\s/g, "") : "";
  const backupCode = typeof input.backupCode === "string" ? input.backupCode.trim() : "";
  if (!/^\d{6}$/.test(code) && !backupCode) {
    return { success: false, message: "Enter the 6-digit code from your authenticator app, or a backup code." };
  }

  let destination: string;
  try {
    const answer = await answerTwoStep({
      challengeToken: step.token,
      ...(backupCode ? { backupCode } : { code }),
      trustDevice: input.trustDevice === true,
    });
    await clearSignInStep();
    destination = await completeSignIn(answer, step.redirectTo, step.persist, step.notice);
  } catch (error) {
    const refusal = toAuthRefusal(error, "That code didn't work. Check the app and try again.");
    if (refusal.reason && ENDED_REASONS.has(refusal.reason)) await clearSignInStep();
    return refusal;
  }
  redirect(destination);
};

// "Back to sign in": the waiting step is dropped.
export const cancelSignInStepAction = async (): Promise<void> => {
  await clearSignInStep();
};

// An admin who must turn two-step on before getting in: the key for the
// authenticator app, as a QR code and as text.
export const startTwoStepSetupAction = async (): Promise<{ success: true; secret: string; otpauthUrl: string } | AuthRefusal> => {
  const step = await getSignInStep();
  if (!step || step.kind !== "setup") return expired();
  try {
    return { success: true, ...(await startTwoStepSetupWithToken(step.token)) };
  } catch (error) {
    return toAuthRefusal(error, "Couldn't start setting up two-step sign-in. Please sign in again.");
  }
};

// The first code from the app turns two-step on and signs the admin in. The
// ten backup codes come back to be shown once; the page then goes on to
// `destination` (the cookies are already set).
export const finishTwoStepSetupAction = async (input: { code: string; trustDevice?: boolean }): Promise<{ success: true; backupCodes: string[]; destination: string } | AuthRefusal> => {
  const step = await getSignInStep();
  if (!step || step.kind !== "setup") return expired();
  const code = typeof input.code === "string" ? input.code.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(code)) return { success: false, message: "Enter the 6-digit code from your authenticator app." };
  try {
    const answer = await enableTwoStepWithToken({ setupToken: step.token, code, trustDevice: input.trustDevice === true });
    await clearSignInStep();
    const destination = await completeSignIn(answer, step.redirectTo, step.persist, step.notice);
    return { success: true, backupCodes: answer.backupCodes ?? [], destination };
  } catch (error) {
    return toAuthRefusal(error, "That code didn't work. Check the app and try again.");
  }
};
