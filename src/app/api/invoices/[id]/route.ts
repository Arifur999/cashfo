import type { NextRequest } from "next/server";
import { clientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/customer/api";
import { getTokenAudience } from "@/lib/tokenAudience";
import { getAccessToken } from "@/lib/tokenUtils";

// Settings › Plans › Payments: an invoice PDF, passed through with the
// customer's token (the browser never calls the backend). The API answers
// 404 for anyone else's invoice. ?inline=1 opens it in the browser's own
// viewer instead of saving it (Checkout's receipt: Print).
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

  const disposition = upstream.headers.get("content-disposition") ?? `attachment; filename="invoice-${id}.pdf"`;
  const inline = request.nextUrl.searchParams.get("inline") === "1";
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": inline ? disposition.replace(/^attachment/i, "inline") : disposition,
      "Cache-Control": "private, no-store",
    },
  });
}
