import type { NextRequest } from "next/server";
import { clientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/customer/api";
import { getTokenAudience } from "@/lib/tokenAudience";
import { getAccessToken } from "@/lib/tokenUtils";

// Settings > Resources > Download my data: the backend's .zip, passed
// through with the customer's token (the browser never calls the backend).
export async function GET(request: NextRequest) {
  const token = await getAccessToken();
  if (!token || getTokenAudience(token) !== "user") return new Response(null, { status: 401 });

  const upstream = await fetch(`${API_BASE_URL}/api/account/export`, {
    headers: { Authorization: `Bearer ${token}`, ...clientHeaders(request.headers) },
    cache: "no-store",
  }).catch(() => null);
  if (!upstream?.ok) return new Response(null, { status: upstream?.status === 429 ? 429 : 502 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": upstream.headers.get("content-disposition") ?? 'attachment; filename="smartly-data.zip"',
      "Cache-Control": "private, no-store",
    },
  });
}
