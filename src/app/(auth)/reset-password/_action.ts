"use server";

import { redirect } from "next/navigation";
import { type AuthRefusal, toAuthRefusal } from "@/lib/authRefusal";
import { CUSTOMER_HOME_ROUTE } from "@/lib/authUtils";
import { ACCOUNT_RESTORED_NOTICE, beginSignInStep, type SignInStepView } from "@/lib/completeSignIn";
import { setAuthCookies } from "@/lib/tokenUtils";
import { type ResetCodeChallenge, resetPassword, sendResetCode } from "@/services/passwordReset.services";
import { isTwoStepPending } from "@/types/auth.types";
import { resetPasswordServerZodSchema } from "@/zod/auth.validation";

// The customer shell (Layout/ShellNotice.tsx) says so in a toast and drops
// the param.
const PASSWORD_CHANGED_NOTICE = "password-changed";

// Resolves on failure, or with the two-step code still to come; otherwise a
// used link signs the customer in on this device (and out everywhere
// else), then opens the customer app.
export const resetPasswordAction = async (values: unknown): Promise<AuthRefusal | { success: true; message: string; step: SignInStepView }> => {
  const parsed = resetPasswordServerZodSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again" };
  }

  let notice = PASSWORD_CHANGED_NOTICE;
  try {
    const answer = await resetPassword(parsed.data);
    // Two-step sign-in is on: the password is changed, and the code from the
    // app signs in (the reset ended every trusted computer).
    if (isTwoStepPending(answer)) {
      return { success: true, message: "", step: await beginSignInStep(answer, { notice: PASSWORD_CHANGED_NOTICE }) };
    }
    await setAuthCookies(answer.accessToken, answer.refreshToken);
    if (answer.restoredFromDeletion) notice = ACCOUNT_RESTORED_NOTICE;
  } catch (error) {
    return toAuthRefusal(error, "We couldn't save your new password. Please try again.");
  }

  redirect(`${CUSTOMER_HOME_ROUTE}?notice=${notice}`);
};

// The emailed code a reset asks for when the customer turned on "Ask for a
// code before a password reset"; with a challenge id, the same code sent
// again.
export const sendResetCodeAction = async (token: unknown, resendChallengeId?: unknown): Promise<{ success: true; challenge: ResetCodeChallenge } | AuthRefusal> => {
  if (typeof token !== "string" || !token.trim()) return { success: false, message: "This reset link is incomplete. Request a new one." };
  try {
    return { success: true, challenge: await sendResetCode(token.trim(), typeof resendChallengeId === "string" ? resendChallengeId : undefined) };
  } catch (error) {
    return toAuthRefusal(error, "We couldn't send the code. Please try again in a minute.");
  }
};
