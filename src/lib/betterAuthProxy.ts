import "server-only";
import { API_BASE_URL } from "@/lib/axios/httpClient";

// better-auth runs on the backend; the browser reaches it through this
// origin's /api/auth, so its cookies (OAuth state, the session) are
// first-party here and Google's redirect URI is <site>/api/auth/callback/google.
//
// Only better-auth's public endpoints pass -- the same list the backend
// exposes (cashfo_backend src/auth/auth-routes.ts). Everything else under
// /api/auth on the backend is a server-to-server API and stays unreachable
// from the browser.
const EXPOSED_ENDPOINTS = new Set(["/sign-in/social", "/get-session", "/sign-out", "/ok", "/error"]);
const EXPOSED_PREFIXES = ["/callback/", "/dash/", "/events/"];
const AUTH_BASE_PATH = "/api/auth";

export const isExposedAuthPath = (pathname: string): boolean => {
  if (!pathname.startsWith(`${AUTH_BASE_PATH}/`)) return false;
  const endpoint = pathname.slice(AUTH_BASE_PATH.length);
  return EXPOSED_ENDPOINTS.has(endpoint) || EXPOSED_PREFIXES.some((prefix) => endpoint.startsWith(prefix) && endpoint.length > prefix.length);
};

const FORWARDED_REQUEST_HEADERS = ["accept", "content-type", "origin", "referer", "user-agent", "x-forwarded-for", "authorization"];

// better-auth's own cookies only -- the app's access/refresh tokens have no
// business on the auth server.
const betterAuthCookies = (cookieHeader: string | null) =>
  (cookieHeader ?? "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.startsWith("better-auth.") || cookie.startsWith("__Secure-better-auth."))
    .join("; ");

// fetch() has already decoded the body and framed it, so these would lie.
const DROPPED_RESPONSE_HEADERS = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive", "set-cookie"]);

export const forwardToBetterAuth = async (request: Request): Promise<Response> => {
  const { pathname, search } = new URL(request.url);
  if (!isExposedAuthPath(pathname)) {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const cookies = betterAuthCookies(request.headers.get("cookie"));
  if (cookies) headers.set("cookie", cookies);

  const upstream = await fetch(`${API_BASE_URL}${pathname}${search}`, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    // Google's redirects are for the browser to follow, not this server.
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, name) => {
    if (!DROPPED_RESPONSE_HEADERS.has(name)) responseHeaders.set(name, value);
  });
  for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append("set-cookie", cookie);

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
};
