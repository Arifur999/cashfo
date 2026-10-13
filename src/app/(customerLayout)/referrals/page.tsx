import { redirect } from "next/navigation";
import { ReferralsPageClient } from "@/components/modules/Customer/Referrals/ReferralsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getReferralInfo } from "@/lib/customer/referrals";

export default async function ReferralsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  const info = await getReferralInfo();

  return (
    <ReferralsPageClient businessId={activeBusinessId} info={info} currency={activeBusiness?.currency ?? "BDT"} canManage={canManage} />
  );
}
