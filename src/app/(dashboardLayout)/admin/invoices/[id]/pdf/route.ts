import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { clientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { getTokenAudience } from "@/lib/tokenAudience";
import { ACCESS_TOKEN_COOKIE } from "@/lib/tokenUtils";

// An invoice's PDF, the same file the customer downloads, passed through
// with the admin's token (the browser never calls the backend). Under
// /admin, so proxy.ts has already checked the session.
export async function GET(request: NextRequest, { params }: RouteContext<"/admin/invoices/[id]/pdf">) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token || getTokenAudience(token) !== "admin") return new Response(null, { status: 401 });
  const { id } = await params;
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) return new Response(null, { status: 404 });

  const upstream = await fetch(`${API_BASE_URL}/admin/invoices/${encodeURIComponent(id)}/pdf`, {
    headers: { Authorization: `Bearer ${token}`, ...clientHeaders(request.headers) },
    cache: "no-store",
  }).catch(() => null);
  if (!upstream?.ok) return new Response(null, { status: upstream?.status === 404 ? 404 : upstream?.status === 429 ? 429 : 502 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": upstream.headers.get("content-disposition") ?? `attachment; filename="invoice-${id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
