import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ReferralsPageClient } from "@/components/modules/Customer/Referrals/ReferralsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getPayoutMethods, getReferralInfo, getWithdrawals, WITHDRAWALS_PAGE_SIZE } from "@/lib/customer/referrals";
import { workspaceName } from "@/lib/customer/workspaceSwitch";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/referrals");

// Account › Referral Program, with its Overview and Withdrawals tabs
// (?tab=withdrawals). The invite link is built from the host this request
// came in on, so it is right on the server render too.
export default async function ReferralsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  // The old bonus lands in this workspace's wallet: worth saying when it is
  // a business, not the reader's own personal one.
  const businessName = activeBusiness && activeBusiness.type !== "PERSONAL" ? workspaceName(activeBusiness, user.name) : null;

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "";

  const [info, methods, withdrawals] = await Promise.all([getReferralInfo(), getPayoutMethods(), getWithdrawals(1)]);

  return (
    <ReferralsPageClient
      businessId={activeBusinessId}
      info={info}
      methods={methods}
      withdrawals={withdrawals}
      withdrawalsPageSize={WITHDRAWALS_PAGE_SIZE}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      workspaceName={businessName}
      userName={user.name}
      origin={origin}
      today={getAppToday()}
    />
  );
}
