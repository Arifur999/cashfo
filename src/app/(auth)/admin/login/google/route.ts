import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { DEFAULT_DASHBOARD_ROUTE, LOGIN_ROUTE } from "@/lib/authUtils";
import { setAuthCookies } from "@/lib/tokenUtils";
import { exchangeSession } from "@/services/auth.services";

// Where "Continue with Google" lands once better-auth's callback has set its
// session cookie: trades that session for the panel's own tokens, then goes
// on to the dashboard -- or back to the login page saying what went wrong.
export const GET = async (request: NextRequest) => {
  const result = await exchangeSession(request.headers);
  if (!result.ok) {
    redirect(`${LOGIN_ROUTE}?error=${result.reason}`);
  }

  await setAuthCookies(result.session.accessToken, result.session.refreshToken);
  redirect(DEFAULT_DASHBOARD_ROUTE);
};
