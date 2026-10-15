import { redirect } from "next/navigation";
import { SavingsGoalsDashboardPageClient } from "@/components/modules/Customer/SavingsGoals/SavingsGoalsDashboardPageClient";
import { getSavingsWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getSavingsGoals, getSavingsOverview } from "@/lib/customer/savingsGoals";
import { getAppToday } from "@/lib/date";

export default async function SavingsGoalsDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  // Money can only be added once there is a savings wallet to keep it in.
  const [goals, overview, savingsWallets] = await Promise.all([getSavingsGoals(activeBusinessId), getSavingsOverview(activeBusinessId), getSavingsWallets(activeBusinessId)]);

  return (
    <SavingsGoalsDashboardPageClient
      businessId={activeBusinessId}
      goals={goals}
      overview={overview}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      hasSavingsWallet={savingsWallets.some((wallet) => wallet.status === "ACTIVE")}
      today={getAppToday()}
    />
  );
}
