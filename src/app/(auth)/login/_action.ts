"use server";

import { isAxiosError } from "axios";
import { redirect } from "next/navigation";
import { retryAfterSeconds } from "@/lib/actionError";
import { type AuthRefusal, toAuthRefusal } from "@/lib/authRefusal";
import { beginSignInStep, completeSignIn, type SignInStepView } from "@/lib/completeSignIn";
import { clearSignInStep } from "@/lib/tokenUtils";
import { signIn } from "@/services/auth.services";
import { isTwoStepPending } from "@/types/auth.types";
import { loginServerZodSchema } from "@/zod/auth.validation";

// The sign-in messages (AdminLoginStates): which one the form shows.
export type SignInFailure = "invalid" | "suspended" | "throttled";

export type SignInAnswer =
  | (AuthRefusal & { failure?: SignInFailure; retryAfter?: number })
  // Two-step sign-in is on: the code (or an admin's set-up) comes next.
  | { success: true; message: string; step: SignInStepView };

// The API's two suspended answers: the admin side's, and the customer
// side's (403), which already says what to do.
const ADMIN_SUSPENDED = "This account has been suspended";
const ADMIN_SUSPENDED_MESSAGE = "This account has been suspended. Ask a super admin to turn it back on.";

function failureOf(error: unknown, refusal: AuthRefusal): SignInAnswer {
  if (isAxiosError(error) && error.response?.status === 429) {
    const seconds = retryAfterSeconds(error.response.headers) ?? 15 * 60;
    return {
      ...refusal,
      failure: "throttled",
      retryAfter: seconds,
      message: "Too many sign-in tries from this network. Try again in {minutes} minutes.",
      values: { minutes: Math.max(1, Math.ceil(seconds / 60)) },
    };
  }
  if (refusal.status === 403 || refusal.message === ADMIN_SUSPENDED) {
    return { ...refusal, failure: "suspended", message: refusal.message === ADMIN_SUSPENDED ? ADMIN_SUSPENDED_MESSAGE : refusal.message };
  }
  if (refusal.status === 401) return { ...refusal, failure: "invalid" };
  return refusal;
}

// Resolves on failure, or with the step two-step sign-in still needs;
// success sets the cookies and redirects, to the admin panel or the
// customer app depending on who signed in.
// `keepSignedIn` false: the cookies last only until the browser closes.
export const signInAction = async (values: unknown, redirectTo?: string, keepSignedIn: unknown = true): Promise<SignInAnswer> => {
  const parsed = loginServerZodSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid email or password" };
  }

  const persist = keepSignedIn !== false;
  let destination: string;
  try {
    const answer = await signIn(parsed.data);
    if (isTwoStepPending(answer)) {
      return { success: true, message: "", step: await beginSignInStep(answer, { persist, redirectTo }) };
    }
    // A step left over from an earlier attempt has nothing more to do.
    await clearSignInStep();
    destination = await completeSignIn(answer, redirectTo, persist);
  } catch (error) {
    return failureOf(error, toAuthRefusal(error, "Invalid email or password"));
  }

  // Outside the try/catch: redirect() throws NEXT_REDIRECT, which the catch
  // would otherwise swallow and leave the person on a dead form.
  redirect(destination);
};
