import { redirect } from "next/navigation";
import { SavingsTransferPageClient } from "@/components/savings-goals/SavingsTransferPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { getSavingsGoals, getSavingsTransfers } from "@/lib/savingsGoals";

export default async function SavingsTransferPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  const [goals, transfers] = await Promise.all([getSavingsGoals(activeBusinessId), getSavingsTransfers(activeBusinessId)]);

  return (
    <SavingsTransferPageClient
      businessId={activeBusinessId}
      goals={goals}
      transfers={transfers}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
    />
  );
}
