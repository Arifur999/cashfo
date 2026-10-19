import type { NextRequest } from "next/server";
import { API_BASE_URL } from "@/lib/customer/api";
import { clientHeaders } from "@/lib/axios/clientHeaders";
import { getTokenAudience } from "@/lib/tokenAudience";
import { getAccessToken } from "@/lib/tokenUtils";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A screenshot on a support message, opened from the admin inbox or from
// the customer's own conversation. The browser never calls the backend, so
// this passes the signed-in token along: admins read any screenshot,
// customers only their own (the backend checks). Never cached, since it may
// show someone's money.
export async function GET(request: NextRequest, ctx: RouteContext<"/api/support-attachments/[id]">) {
  const { id } = await ctx.params;
  const token = await getAccessToken();
  if (!token || !UUID.test(id)) return new Response(null, { status: 404 });

  const path = getTokenAudience(token) === "admin" ? `/admin/tickets/attachments/${id}` : `/api/support/attachments/${id}`;
  const upstream = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, ...clientHeaders(request.headers) },
    cache: "no-store",
  }).catch(() => null);
  const type = upstream?.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (!upstream?.ok || !IMAGE_TYPES.has(type)) return new Response(null, { status: upstream?.status === 401 || upstream?.status === 403 ? upstream.status : 404 });

  return new Response(upstream.body, {
    headers: { "Content-Type": type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" },
  });
}
