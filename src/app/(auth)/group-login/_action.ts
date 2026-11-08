"use server";

import { isAxiosError } from "axios";
import { redirect } from "next/navigation";
import { retryAfterSeconds } from "@/lib/actionError";
import { LOGIN_ROUTE } from "@/lib/authUtils";
import { toAuthRefusal } from "@/lib/authRefusal";
import { beginSignInStep, completeSignIn } from "@/lib/completeSignIn";
import { clearSignInStep } from "@/lib/tokenUtils";
import { signIn } from "@/services/auth.services";
import { isTwoStepPending } from "@/types/auth.types";

export interface MemberSignInAnswer {
  success: false;
  message: string;
  values?: Record<string, string | number>;
}

// Group Expense's member sign-in (the GroupLogin board): a username or a
// mobile number, and the password. The API's one sign-in route works out
// which login it names. Success opens the member's groups; an account with
// two-step sign-in on finishes on the main sign-in page.
export async function memberSignInAction(identifier: unknown, password: unknown): Promise<MemberSignInAnswer> {
  const id = typeof identifier === "string" ? identifier.trim() : "";
  const secret = typeof password === "string" ? password : "";
  if (!id) return { success: false, message: "Enter your username or mobile number." };
  if (!secret) return { success: false, message: "Enter your password." };
  if (id.length > 254 || secret.length > 128) return { success: false, message: "Wrong username, number or password." };

  let destination: string;
  try {
    const answer = await signIn({ email: id.toLowerCase(), password: secret });
    if (isTwoStepPending(answer)) {
      await beginSignInStep(answer, { redirectTo: "/group-expenses" });
      destination = `${LOGIN_ROUTE}?step=two-step`;
    } else {
      await clearSignInStep();
      destination = await completeSignIn(answer, "/group-expenses");
    }
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 429) {
      const seconds = retryAfterSeconds(error.response.headers) ?? 15 * 60;
      return { success: false, message: "Too many sign-in tries from this network. Try again in {minutes} minutes.", values: { minutes: Math.max(1, Math.ceil(seconds / 60)) } };
    }
    const refusal = toAuthRefusal(error, "Wrong username, number or password.");
    // Unknown login and wrong password answer alike: nothing says which logins exist.
    return { success: false, message: refusal.status === 401 || refusal.status === 400 ? "Wrong username, number or password. Forgot it? Ask your group admin for a new link." : refusal.message };
  }
  redirect(destination);
}
