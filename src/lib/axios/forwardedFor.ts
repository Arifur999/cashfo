import "server-only";
import { headers } from "next/headers";

// Every backend call leaves from this Next.js server, so on its own the API
// would see one address -- ours -- for every admin: a single shared login
// throttle, and Login Monitoring / the audit log full of the server's IP.
// Passing the incoming X-Forwarded-For chain along lets the backend, which
// trusts only this hop (its TRUST_PROXY), pick the real client out of it.
// That chain is only trustworthy behind a proxy that appends the client
// address (nginx in production; locally Next fills it from the socket).
export const forwardedForHeader = (value: string | null | undefined): Record<string, string> =>
  value ? { "X-Forwarded-For": value } : {};

// For Server Components and Server Actions. proxy.ts can't call headers(),
// so it hands its request's header to forwardedForHeader() directly.
export const getForwardedForHeader = async (): Promise<Record<string, string>> => {
  try {
    return forwardedForHeader((await headers()).get("x-forwarded-for"));
  } catch {
    // Outside a request (build-time rendering) there's nothing to forward.
    return {};
  }
};
