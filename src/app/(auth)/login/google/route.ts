import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { normalizeInviteCode, normalizeInviteSource } from "@/components/modules/Auth/authFormError";
import { LOGIN_ROUTE, REGISTER_ROUTE, TWO_STEP_LOGIN_ROUTE } from "@/lib/authUtils";
import { beginSignInStep, completeSignIn } from "@/lib/completeSignIn";
import { clearSignInStep, trustedDeviceHeaderFrom } from "@/lib/tokenUtils";
import { exchangeSession } from "@/services/auth.services";
import { isTwoStepPending } from "@/types/auth.types";

// Where "Continue with Google" lands once better-auth's callback has set its
// session cookie: trades that session for the site's own tokens, then opens
// the admin panel or the customer app -- or the two-step code first, when
// it is on -- or goes back to where the sign-in began, saying what went
// wrong.
export const GET = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  // The invite code a Google sign-up began with on /register?ref=.
  const referralCode = normalizeInviteCode(searchParams.get("ref"));
  const referralSource = referralCode ? normalizeInviteSource(searchParams.get("src")) : undefined;
  const redirectTo = searchParams.get("redirect");
  const result = await exchangeSession(request.headers, referralCode, trustedDeviceHeaderFrom(request.cookies.getAll()), referralSource);
  if (!result.ok) {
    // A sign-up goes back to the sign-up page with its invite code, so the
    // person who invited them still gets the credit on the next try; a
    // sign-in keeps the page it was headed for.
    const back = new URLSearchParams();
    if (referralCode) back.set("ref", referralCode);
    if (referralSource) back.set("src", referralSource);
    if (redirectTo) back.set("redirect", redirectTo);
    back.set("error", result.reason);
    redirect(`${referralCode ? REGISTER_ROUTE : LOGIN_ROUTE}?${back.toString()}`);
  }

  if (isTwoStepPending(result.session)) {
    await beginSignInStep(result.session, { redirectTo });
    redirect(TWO_STEP_LOGIN_ROUTE);
  }
  await clearSignInStep();
  redirect(await completeSignIn(result.session, redirectTo));
};
