import { redirect } from "next/navigation";
import { ReferralsPageClient } from "@/components/referrals/ReferralsPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { getReferralInfoAction } from "@/lib/referralActions";

export default async function ReferralsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  const result = await getReferralInfoAction();

  return (
    <ReferralsPageClient businessId={activeBusinessId} info={result.data ?? null} currency={activeBusiness?.currency ?? "BDT"} canManage={canManage} />
  );
}
