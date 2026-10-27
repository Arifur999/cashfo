import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { API_BASE_URL } from "@/lib/axios/httpClient";
import { clientHeaders } from "@/lib/axios/clientHeaders";
import { getTokenAudience } from "@/lib/tokenAudience";
import { ACCESS_TOKEN_COOKIE } from "@/lib/tokenUtils";

const PASSED = ["status", "method", "search"] as const;

// Referrals & Payouts > Export: the API's spreadsheet of every request the
// desk's tabs and method pick, passed through with the admin's token (the
// browser never calls the backend). Under /admin, so proxy.ts has already
// checked the session and refreshed the token.
export async function GET(request: NextRequest) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token || getTokenAudience(token) !== "admin") return new Response(null, { status: 401 });
  const query = new URLSearchParams();
  for (const key of PASSED) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) query.set(key, value);
  }

  const upstream = await fetch(`${API_BASE_URL}/admin/referrals/payouts/export${query.size ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${token}`, ...clientHeaders(request.headers) },
    cache: "no-store",
  }).catch(() => null);
  if (!upstream?.ok) return new Response(null, { status: upstream?.status === 400 ? 400 : upstream?.status === 429 ? 429 : 502 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": upstream.headers.get("content-disposition") ?? 'attachment; filename="referral-payouts.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
