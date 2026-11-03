import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { clientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { getTokenAudience } from "@/lib/tokenAudience";
import { ACCESS_TOKEN_COOKIE } from "@/lib/tokenUtils";

// The raster types the API stores; anything else is never served as one.
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// A customer's screenshot of the money they sent (Checkout), passed through
// with the admin's token (the browser never calls the backend). Under
// /admin, so proxy.ts has already checked the session. Never cached: it
// shows the customer's wallet.
export async function GET(request: NextRequest, { params }: RouteContext<"/admin/payments/[id]/proof">) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token || getTokenAudience(token) !== "admin") return new Response(null, { status: 401 });
  const { id } = await params;
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) return new Response(null, { status: 404 });

  const upstream = await fetch(`${API_BASE_URL}/admin/payments/${encodeURIComponent(id)}/proof`, {
    headers: { Authorization: `Bearer ${token}`, ...clientHeaders(request.headers) },
    cache: "no-store",
  }).catch(() => null);
  if (!upstream?.ok) return new Response(null, { status: upstream?.status === 404 ? 404 : upstream?.status === 429 ? 429 : 502 });
  const type = upstream.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (!IMAGE_TYPES.has(type)) return new Response(null, { status: 502 });

  return new Response(upstream.body, {
    headers: { "Content-Type": type, "Content-Disposition": "inline", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
