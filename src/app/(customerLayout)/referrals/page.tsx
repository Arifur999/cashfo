import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReferralsPageClient } from "@/components/modules/Customer/Referrals/ReferralsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getReferralInfo } from "@/lib/customer/referrals";

// Account › Invite & earn. The invite link is built from the host this
// request came in on, so it is right on the server render too.
export default async function ReferralsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "";

  const info = await getReferralInfo();

  return <ReferralsPageClient businessId={activeBusinessId} info={info} currency={activeBusiness?.currency ?? "BDT"} canManage={canManage} origin={origin} />;
}
