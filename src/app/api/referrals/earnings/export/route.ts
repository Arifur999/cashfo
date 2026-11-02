import type { NextRequest } from "next/server";
import { clientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/customer/api";
import { getTokenAudience } from "@/lib/tokenAudience";
import { getAccessToken } from "@/lib/tokenUtils";

const STATUS = /^(ON_HOLD|AVAILABLE|IN_WITHDRAWAL|UNDER_CHECK|PAID_OUT|REVERSED|CANCELLED)$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

// Referrals > Earnings > Download statement: the backend's CSV of the
// member's commission lines (the status and month shown), passed through
// with the customer's token -- the browser never calls the backend.
export async function GET(request: NextRequest) {
  const token = await getAccessToken();
  if (!token || getTokenAudience(token) !== "user") return new Response(null, { status: 401 });

  const params = new URLSearchParams();
  const status = request.nextUrl.searchParams.get("status");
  const month = request.nextUrl.searchParams.get("month");
  if (status && STATUS.test(status)) params.set("status", status);
  if (month && MONTH.test(month)) params.set("month", month);
  const query = params.toString();

  const upstream = await fetch(`${API_BASE_URL}/api/referrals/earnings/export${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${token}`, ...clientHeaders(request.headers) },
    cache: "no-store",
  }).catch(() => null);
  if (!upstream?.ok) return new Response(null, { status: upstream?.status === 429 ? 429 : 502 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="referral-earnings${month && MONTH.test(month) ? `-${month}` : ""}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
