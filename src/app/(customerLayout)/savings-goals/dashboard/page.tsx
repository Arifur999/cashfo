import { redirect } from "next/navigation";
import { SavingsGoalsDashboardPageClient } from "@/components/modules/Customer/SavingsGoals/SavingsGoalsDashboardPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getSavingsGoals, getSavingsOverview } from "@/lib/customer/savingsGoals";

export default async function SavingsGoalsDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  const [goals, overview] = await Promise.all([getSavingsGoals(activeBusinessId), getSavingsOverview(activeBusinessId)]);

  return (
    <SavingsGoalsDashboardPageClient
      businessId={activeBusinessId}
      goals={goals}
      overview={overview}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
    />
  );
}
