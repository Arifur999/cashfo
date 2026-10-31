import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { API_BASE_URL } from "@/lib/customer/api";
import { customerApi } from "@/lib/customer/apiClient";
import { getCurrentUser } from "@/lib/customer/auth";

// Savings goals › Details › Statement › Download PDF: the goal's statement as
// the API draws it, for the open workspace, passed through with the
// customer's token and the workspace's PIN unlock (the browser never calls
// the backend).
export async function GET(_request: Request, { params }: RouteContext<"/api/savings-statement/[goalId]">) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const businessId = await resolveActiveBusinessId(user.businesses);
  const { goalId } = await params;
  if (!businessId || !/^[A-Za-z0-9-]{1,64}$/.test(goalId)) return new Response(null, { status: 404 });

  try {
    const upstream = await customerApi.get<ArrayBuffer>(`${API_BASE_URL}/api/businesses/${businessId}/savings-goals/${encodeURIComponent(goalId)}/statement.pdf`, { responseType: "arraybuffer" });
    return new Response(upstream.data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": String(upstream.headers["content-disposition"] ?? `attachment; filename="savings-statement.pdf"`),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    return new Response(null, { status: status === 404 || status === 423 || status === 429 ? status : 502 });
  }
}
