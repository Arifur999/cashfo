// Next.js 16 renamed `middleware.ts` to `proxy.ts` (same runtime behavior,
// new file/export name). This runs before every request: it gates
// unauthenticated access to non-auth pages, and proactively refreshes an
// access token that's about to expire. Mirrors admin-frontend/src/proxy.ts.
// This is the ONE reusable route-protection mechanism for the whole app --
// individual pages/layouts don't need to reimplement this check (see also
// (dashboard)/layout.tsx's defense-in-depth redirect for Server Components
// that render before proxy's redirect would otherwise apply).
//
// Proactive refresh happens here rather than in a Server Component because
// Server Components can only READ cookies -- writing the refreshed token
// back requires a Route Handler, Server Action, or (as here) proxy, which can
// set cookies on the outgoing response.
//
// The token is only decoded here, not signature-verified -- this frontend
// doesn't hold the JWT secret (that stays backend-only), so this check is a
// UX-level gate, not the security boundary. The backend's UserAuthGuard
// verifies the signature on every real request.

import axios from "axios";
import jwt from "jsonwebtoken";
import { NextResponse, type NextRequest } from "next/server";
import { API_BASE_URL } from "./lib/api";

const ACCESS_TOKEN_COOKIE = "accessToken";
const REFRESH_TOKEN_COOKIE = "refreshToken";
const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_THRESHOLD_SECONDS = 60;

const PUBLIC_PATHS = new Set(["/login", "/register", "/forgot-password"]);

interface DecodedAccessToken {
  sub: string;
  exp: number;
}

function safeDecode(token: string): DecodedAccessToken | null {
  const payload = jwt.decode(token);
  if (!payload || typeof payload !== "object" || typeof (payload as { exp?: unknown }).exp !== "number") {
    return null;
  }
  return payload as DecodedAccessToken;
}

async function tryRefresh(refreshToken: string): Promise<string | null> {
  try {
    const response = await axios.post<{ accessToken: string }>(`${API_BASE_URL}/api/auth/refresh`, {
      refreshToken,
    });
    return response.data.accessToken;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  let accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  let decoded = accessToken ? safeDecode(accessToken) : null;
  let refreshedAccessToken: string | null = null;

  const isExpiringSoon = decoded ? decoded.exp - Date.now() / 1000 < REFRESH_THRESHOLD_SECONDS : true;

  if (refreshToken && (!decoded || isExpiringSoon)) {
    refreshedAccessToken = await tryRefresh(refreshToken);
    if (refreshedAccessToken) {
      accessToken = refreshedAccessToken;
      decoded = safeDecode(refreshedAccessToken);
    }
  }

  const isAuthenticated = Boolean(decoded);

  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isAuthenticated && !isPublicPath) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }

  const response = NextResponse.next();
  if (refreshedAccessToken) {
    response.cookies.set(ACCESS_TOKEN_COOKIE, refreshedAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
