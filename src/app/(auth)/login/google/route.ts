import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { LOGIN_ROUTE } from "@/lib/authUtils";
import { completeSignIn } from "@/lib/completeSignIn";
import { exchangeSession } from "@/services/auth.services";

// Where "Continue with Google" lands once better-auth's callback has set its
// session cookie: trades that session for the site's own tokens, then opens
// the admin panel or the customer app -- or goes back to the login page
// saying what went wrong.
export const GET = async (request: NextRequest) => {
  // The invite code a Google sign-up began with on /register?ref=.
  const referralCode = request.nextUrl.searchParams.get("ref")?.trim().slice(0, 64) || undefined;
  const result = await exchangeSession(request.headers, referralCode);
  if (!result.ok) {
    redirect(`${LOGIN_ROUTE}?error=${result.reason}`);
  }

  redirect(await completeSignIn(result.session, request.nextUrl.searchParams.get("redirect")));
};
