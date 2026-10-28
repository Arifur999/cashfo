import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { USERS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/UserManagement/usersTable.config";
import { clientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { getTokenAudience } from "@/lib/tokenAudience";
import { ACCESS_TOKEN_COOKIE } from "@/lib/tokenUtils";

// Users > Export CSV: the API's spreadsheet of every user the list's
// filters match. The API keeps it to super and support admins and writes it
// to the audit log, since it is a list of people's contact details.
// Under /admin, so proxy.ts has already checked the session.
export async function GET(request: NextRequest) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token || getTokenAudience(token) !== "admin") return new Response(null, { status: 401 });
  const query = new URLSearchParams();
  for (const key of USERS_TABLE_BASE_CONFIG.queryKeys) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) query.set(key, value);
  }

  const upstream = await fetch(`${API_BASE_URL}/admin/owners/export${query.size ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${token}`, ...clientHeaders(request.headers) },
    cache: "no-store",
  }).catch(() => null);
  if (!upstream?.ok) return new Response(null, { status: upstream && [400, 403, 429].includes(upstream.status) ? upstream.status : 502 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": upstream.headers.get("content-disposition") ?? 'attachment; filename="users.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
