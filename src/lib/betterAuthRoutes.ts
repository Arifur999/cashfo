// The better-auth endpoints this origin passes through to the backend -- the
// same list the backend itself exposes (cashfo_backend
// src/auth/auth-routes.ts). Everything else under /api/auth on the backend
// is a server-to-server API and stays unreachable from the browser.
const AUTH_BASE_PATH = "/api/auth";
const EXPOSED_ENDPOINTS = new Set(["/sign-in/social", "/get-session", "/sign-out", "/ok", "/error"]);
// OAuth callbacks (/callback/google) and the Better Auth dashboard.
const EXPOSED_PREFIXES = ["/callback/", "/dash/", "/events/"];

// Takes a pathname as the URL parser produced it, so dot segments are
// already folded away.
export const isExposedAuthPath = (pathname: string): boolean => {
  if (!pathname.startsWith(`${AUTH_BASE_PATH}/`)) return false;
  const endpoint = pathname.slice(AUTH_BASE_PATH.length);
  return EXPOSED_ENDPOINTS.has(endpoint) || EXPOSED_PREFIXES.some((prefix) => endpoint.startsWith(prefix) && endpoint.length > prefix.length);
};
