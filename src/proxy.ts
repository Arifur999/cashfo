// Next.js 16 renamed `middleware.ts` to `proxy.ts` (same runtime behavior, new
// file/export name -- see AGENTS.md). Runs before every page request, page
// renders and Server Action POSTs alike, and only consults the route table in
// lib/authUtils.ts:
//
//   0. refresh an access token that's missing or about to expire
//   1. "/" -> the visitor's home, or the sign-in page
//   2. a signed-in visitor has no business on the sign-in forms -> home
//   3. no valid session -> the sign-in page, remembering where they were going
//   4. the other side's pages -> the visitor's own home: admins live in
//      /admin, customers everywhere else
//   5. an admin role that can't open this section -> the admin dashboard,
//      never a 403 page
//
// Proactive refresh lives here because Server Components can only READ
// cookies; proxy can set the refreshed token on the outgoing response, and
// cookies() sees it for the rest of the request.
//
// Tokens are only decoded, not signature-verified -- this frontend doesn't
// hold the JWT secrets, so this is a UX-level gate. The backend's guards
// verify the signature, and the live session, on every real request.

import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_HOME_ROUTE,
  canAccessRoute,
  CUSTOMER_HOME_ROUTE,
  homeRouteFor,
  isGuestOnlyRoute,
  LOGIN_ROUTE,
  openRoutes,
  routeAudience,
  SESSION_EXPIRED_REASON,
  sessionFromClaims,
} from "./lib/authUtils";
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

const withoutAuthCookies = (response: NextResponse) => {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  return response;
};

export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  // A reset link works for whoever opens it, and the Google landing route
  // replaces whatever session was there -- neither depends on the current one.
  if (openRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // The backend rejected a token this proxy would still accept (see
  // SESSION_EXPIRED_REASON): drop the stale cookies and show the sign-in
  // page, rather than redirecting straight back home in a loop.
  if (pathname === LOGIN_ROUTE && searchParams.get("reason") === SESSION_EXPIRED_REASON) {
    return withoutAuthCookies(NextResponse.next());
  }

  let accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  let refreshedAccessToken: string | null = null;

  // Rule 0 -- refresh proactively, on whichever side the token belongs to.
  if (refreshToken && (!accessToken || isTokenExpiringSoon(accessToken))) {
    refreshedAccessToken = await refreshAccessToken(refreshToken, request.headers);
    if (refreshedAccessToken) {
      accessToken = refreshedAccessToken;
    }
  }

  // A decodable but already-expired token is not a session.
  const session =
    accessToken && getTokenSecondsRemaining(accessToken) > 0 ? sessionFromClaims(jwtUtils.decodeToken<IAccessTokenPayload>(accessToken)) : null;

  // Every response that lets the visitor through carries the refreshed
  // token, redirects included -- otherwise the very next request refreshes
  // again.
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
  const redirectTo = (path: string) => withRefreshedCookie(NextResponse.redirect(new URL(path, request.url)));

  // Rule 1
  if (pathname === "/") {
    return redirectTo(session ? homeRouteFor(session.audience) : LOGIN_ROUTE);
  }

  // Rule 2
  if (isGuestOnlyRoute(pathname)) {
    return session ? redirectTo(homeRouteFor(session.audience)) : NextResponse.next();
  }

  // Rule 3
  if (!session) {
    const loginUrl = new URL(LOGIN_ROUTE, request.url);
    if (pathname !== ADMIN_HOME_ROUTE && pathname !== CUSTOMER_HOME_ROUTE) {
      loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    }
    return withoutAuthCookies(NextResponse.redirect(loginUrl));
  }

  // Rule 4
  if (routeAudience(pathname) !== session.audience) {
    return redirectTo(homeRouteFor(session.audience));
  }

  // Rule 5
  if (session.audience === "admin" && !canAccessRoute(pathname, session.role)) {
    return redirectTo(ADMIN_HOME_ROUTE);
  }

  return withRefreshedCookie(NextResponse.next());
}

export const config = {
  // Every page; not API routes (better-auth's proxy among them), Next's own
  // assets, or files with an extension (favicon.ico, robots.txt, images).
  matcher: ["/((?!api/|_next/|.*\\.\\w+$).*)"],
};
