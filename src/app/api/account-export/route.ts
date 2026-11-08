import type { NextRequest } from "next/server";
import { clientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/customer/api";
import { getTokenAudience } from "@/lib/tokenAudience";
import { getAccessToken, getAllWorkspaceUnlocks } from "@/lib/tokenUtils";

// Settings > Resources > Download my data, and Settings › Data & privacy ›
// Export (its sections, dates and format in the query): the backend's
// file, passed through with the customer's token (the browser never calls
// the backend) and the unlocks of the PIN-locked workspaces opened on this
// device: the others are left out.
const PASSED = ["sections", "format", "from", "to"];
export async function GET(request: NextRequest) {
  const token = await getAccessToken();
  if (!token || getTokenAudience(token) !== "user") return new Response(null, { status: 401 });

  const unlocks = await getAllWorkspaceUnlocks();
  const query = new URLSearchParams();
  for (const key of PASSED) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) query.set(key, value);
  }
  const upstream = await fetch(`${API_BASE_URL}/api/account/export${query.size > 0 ? `?${query.toString()}` : ""}`, {
    headers: { Authorization: `Bearer ${token}`, ...clientHeaders(request.headers), ...(unlocks && { "x-workspace-unlock": unlocks }) },
    cache: "no-store",
  }).catch(() => null);
  if (!upstream?.ok) return new Response(null, { status: upstream?.status === 429 || upstream?.status === 400 ? upstream.status : 502 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/zip",
      "Content-Disposition": upstream.headers.get("content-disposition") ?? 'attachment; filename="smartly-data.zip"',
      "Cache-Control": "private, no-store",
    },
  });
}
