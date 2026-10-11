import "server-only";
import { headers } from "next/headers";

// Every backend call leaves from this Next.js server, so on its own the API
// would see one client -- this server -- for every admin: a single shared
// login throttle, and Login Monitoring, the audit log and session records
// full of our address and our HTTP client. Passing the incoming
// X-Forwarded-For chain and the browser's User-Agent along lets the backend,
// which trusts only this hop (its TRUST_PROXY), record the real client.
// The chain is only trustworthy behind a proxy that appends the client
// address (nginx in production; locally Next fills it from the socket).
export const clientHeaders = (source: Pick<Headers, "get">): Record<string, string> => {
  const forwardedFor = source.get("x-forwarded-for");
  const userAgent = source.get("user-agent");
  return {
    ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
    ...(userAgent ? { "User-Agent": userAgent } : {}),
  };
};

// For Server Components and Server Actions. proxy.ts can't call headers(),
// so it hands its own request's headers to clientHeaders() directly.
export const getClientHeaders = async (): Promise<Record<string, string>> => {
  try {
    return clientHeaders(await headers());
  } catch {
    // Outside a request (build-time rendering) there's nothing to forward.
    return {};
  }
};
