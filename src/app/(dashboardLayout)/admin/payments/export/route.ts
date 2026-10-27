import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { PAYMENTS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Payments/paymentsTable.config";
import { clientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { getTokenAudience } from "@/lib/tokenAudience";
import { ACCESS_TOKEN_COOKIE } from "@/lib/tokenUtils";

// Payments > Export: the API's spreadsheet of every payment the list's
// filters match (the export is written to the audit log there), passed
// through with the admin's token -- the browser never calls the backend.
// Under /admin, so proxy.ts has already checked the session.
export async function GET(request: NextRequest) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token || getTokenAudience(token) !== "admin") return new Response(null, { status: 401 });
  const query = new URLSearchParams();
  for (const key of PAYMENTS_TABLE_BASE_CONFIG.queryKeys) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) query.set(key, value);
  }

  const upstream = await fetch(`${API_BASE_URL}/admin/payments/export${query.size ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${token}`, ...clientHeaders(request.headers) },
    cache: "no-store",
  }).catch(() => null);
  if (!upstream?.ok) return new Response(null, { status: upstream?.status === 400 ? 400 : upstream?.status === 429 ? 429 : 502 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": upstream.headers.get("content-disposition") ?? 'attachment; filename="payments.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
