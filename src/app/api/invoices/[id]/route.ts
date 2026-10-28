import type { NextRequest } from "next/server";
import { clientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/customer/api";
import { getTokenAudience } from "@/lib/tokenAudience";
import { getAccessToken } from "@/lib/tokenUtils";

// Settings › Plans › Payments: an invoice PDF, passed through with the
// customer's token (the browser never calls the backend). The API answers
// 404 for anyone else's invoice.
export async function GET(request: NextRequest, { params }: RouteContext<"/api/invoices/[id]">) {
  const token = await getAccessToken();
  if (!token || getTokenAudience(token) !== "user") return new Response(null, { status: 401 });
  const { id } = await params;
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) return new Response(null, { status: 404 });

  const upstream = await fetch(`${API_BASE_URL}/api/billing/invoices/${encodeURIComponent(id)}/pdf`, {
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
