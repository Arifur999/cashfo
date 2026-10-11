import "server-only";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { betterAuthCookies } from "@/lib/betterAuthCookies";
import { isExposedAuthPath } from "@/lib/betterAuthRoutes";

// better-auth runs on the backend; the browser reaches it through this
// origin's /api/auth, so its cookies (OAuth state, the session) are
// first-party here and Google's redirect URI is <site>/api/auth/callback/google.
// Only its public endpoints pass (lib/betterAuthRoutes.ts).

const FORWARDED_REQUEST_HEADERS = ["accept", "content-type", "origin", "referer", "user-agent", "x-forwarded-for", "authorization"];

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
