// Next.js 16 renamed `middleware.ts` to `proxy.ts` (same runtime behavior, new
// file/export name -- see AGENTS.md). Runs before every /admin/* request, page
// renders and Server Action POSTs alike, and only consults the route table in
// lib/authUtils.ts:
//
//   0. refresh an access token that's missing or about to expire
//   1. a signed-in admin has no business on the login page
//   2. no valid session -> the login page, remembering where they were going
//   3. a role that can't open this section -> the dashboard, never a 403 page
//
// Proactive refresh lives here because Server Components can only READ
// cookies; proxy can set the refreshed token on the outgoing response, and
// cookies() sees it for the rest of the request.
//
// Tokens are only decoded, not signature-verified -- this frontend doesn't
// hold the JWT secret, so this is a UX-level gate. The backend's
// AdminAuthGuard verifies the signature on every real request.

import { NextResponse, type NextRequest } from "next/server";
import { canAccessRoute, DEFAULT_DASHBOARD_ROUTE, isAuthRoute, LOGIN_ROUTE, SESSION_EXPIRED_REASON } from "./lib/authUtils";
import { jwtUtils } from "./lib/jwtUtils";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  getTokenSecondsRemaining,
  isTokenExpiringSoon,
  REFRESH_TOKEN_COOKIE,
} from "./lib/tokenUtils";
import { refreshAccessToken } from "./services/auth.services";
import type { IAccessTokenPayload } from "./types/auth.types";

export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const isLoginPage = isAuthRoute(pathname);

  // The backend rejected a token this proxy would still accept (see
  // SESSION_EXPIRED_REASON): drop the stale cookies and show the login page,
  // rather than redirecting straight back to the dashboard in a loop.
  if (isLoginPage && searchParams.get("reason") === SESSION_EXPIRED_REASON) {
    const response = NextResponse.next();
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }

  let accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  let refreshedAccessToken: string | null = null;

  // Rule 0 -- refresh proactively.
  if (refreshToken && (!accessToken || isTokenExpiringSoon(accessToken))) {
    refreshedAccessToken = await refreshAccessToken(refreshToken, request.headers.get("x-forwarded-for"));
    if (refreshedAccessToken) {
      accessToken = refreshedAccessToken;
    }
  }

  const decoded = accessToken ? jwtUtils.decodeToken<IAccessTokenPayload>(accessToken) : null;
  // A decodable but already-expired token is not a session.
  const isAuthenticated = Boolean(decoded && accessToken && getTokenSecondsRemaining(accessToken) > 0);

  // Every response that lets the admin through carries the refreshed token,
  // redirects included -- otherwise the very next request refreshes again.
  const withRefreshedCookie = (response: NextResponse) => {
    if (refreshedAccessToken) {
      const remaining = getTokenSecondsRemaining(refreshedAccessToken);
      response.cookies.set(ACCESS_TOKEN_COOKIE, refreshedAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: remaining > 0 ? remaining : ACCESS_TOKEN_MAX_AGE_SECONDS,
      });
    }
    return response;
  };

  // Rule 1
  if (isAuthenticated && isLoginPage) {
    return withRefreshedCookie(NextResponse.redirect(new URL(DEFAULT_DASHBOARD_ROUTE, request.url)));
  }

  // Rule 2
  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL(LOGIN_ROUTE, request.url);
    if (pathname !== DEFAULT_DASHBOARD_ROUTE) {
      loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }

  // Rule 3
  if (decoded && !canAccessRoute(pathname, decoded.role)) {
    return withRefreshedCookie(NextResponse.redirect(new URL(DEFAULT_DASHBOARD_ROUTE, request.url)));
  }

  return withRefreshedCookie(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*"],
};
