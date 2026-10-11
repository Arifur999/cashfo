import "server-only";

// better-auth names its cookies (session, OAuth state) with this prefix --
// and __Secure- in front of it on HTTPS.
export const isBetterAuthCookie = (name: string) => name.startsWith("better-auth.") || name.startsWith("__Secure-better-auth.");

// A Cookie header narrowed to better-auth's own cookies -- the panel's
// access/refresh tokens have no business on the auth server.
export const betterAuthCookies = (cookieHeader: string | null) =>
  (cookieHeader ?? "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => isBetterAuthCookie(cookie.split("=")[0]))
    .join("; ");
