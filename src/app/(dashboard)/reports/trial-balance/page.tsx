import { redirect } from "next/navigation";
import { TrialBalancePageClient } from "@/components/reports/TrialBalancePageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { getTrialBalance } from "@/lib/reports";

export default async function TrialBalancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const trialBalance = await getTrialBalance(activeBusinessId);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  return <TrialBalancePageClient data={trialBalance} preferredLanguage={user.preferredLanguage} currency={activeBusiness?.currency ?? "BDT"} />;
}
