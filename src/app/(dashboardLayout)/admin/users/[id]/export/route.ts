import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { clientHeaders } from "@/lib/axios/clientHeaders";
import { getTokenAudience } from "@/lib/tokenAudience";
import { ACCESS_TOKEN_COOKIE } from "@/lib/tokenUtils";

// A person's page > ⋯ > Download a copy: the customer's own "Download my
// data" zip, passed through with the admin's token (the browser never
// calls the backend). The API lets only a super admin have it, only with
// the support code the customer made, and writes it to the audit log.
// Under /admin, so proxy.ts has already checked the session and refreshed
// the token.
export async function POST(request: NextRequest, { params }: RouteContext<"/admin/users/[id]/export">) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token || getTokenAudience(token) !== "admin") return new Response(null, { status: 401 });
  const { id } = await params;
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) return new Response(null, { status: 404 });
  const code = ((await request.json().catch(() => null)) as { code?: unknown } | null)?.code;
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return new Response(null, { status: 400 });

  const upstream = await fetch(`${API_BASE_URL}/admin/owners/${encodeURIComponent(id)}/export`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...clientHeaders(request.headers) },
    body: JSON.stringify({ code }),
    cache: "no-store",
  }).catch(() => null);
  if (!upstream?.ok) {
    const status = upstream?.status;
    // A refused code says why, in the API's words.
    if (status === 403) return Response.json({ message: ((await upstream?.json().catch(() => null)) as { message?: string } | null)?.message }, { status });
    return new Response(null, { status: status === 404 || status === 429 ? status : 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": upstream.headers.get("content-disposition") ?? `attachment; filename="user-${id}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
