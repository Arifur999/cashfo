import { redirect } from "next/navigation";
import { MonthlyIncomeGoalPageClient } from "@/components/budget/MonthlyIncomeGoalPageClient";
import { getCurrentUser } from "@/lib/auth";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getIncomeGoals } from "@/lib/budgets";

export default async function IncomeGoalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const goals = await getIncomeGoals(activeBusinessId);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return (
    <MonthlyIncomeGoalPageClient businessId={activeBusinessId} goals={goals} currency={activeBusiness?.currency ?? "BDT"} canManage={canManage} />
  );
}
