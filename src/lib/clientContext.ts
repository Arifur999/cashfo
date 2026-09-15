import { headers } from "next/headers";

// Real end-user device info for Settings > Security's Device Management --
// axios's own request (made server-side, from the Next.js process to the
// backend) always carries axios's own default User-Agent and this
// machine's own IP, never the actual browser's, since "the browser never
// talks to the backend directly" (see CLAUDE.md). Login/register are the
// only calls that need this: they're what create a UserSession row on the
// backend (see UserAuthService.issueTokens()) -- forwarded as custom
// headers the backend explicitly prefers over its own req.ip/User-Agent
// for exactly these two routes (see UserAuthController.register()/login()).
export async function clientRequestHeaders(): Promise<Record<string, string>> {
  const h = await headers();
  const result: Record<string, string> = {};

  const userAgent = h.get("user-agent");
  if (userAgent) result["x-client-user-agent"] = userAgent;

  // x-forwarded-for is only present behind a real reverse proxy/CDN (this
  // app has none in local dev) -- absent here, the backend falls back to
  // its own req.ip, same as before this existed.
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) result["x-client-ip"] = forwardedFor.split(",")[0].trim();

  return result;
}
