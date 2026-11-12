import { redirect } from "next/navigation";
import { SavingsPlansPageClient } from "@/components/modules/Customer/SavingsGoals/SavingsPlansPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getSavingsGoals, getSavingsPlans } from "@/lib/customer/savingsGoals";
import { goalsHero } from "@/lib/customer/savingsPlan";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/savings-goals/plans");

export default async function SavingsPlansPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const today = getAppToday();

  // The goals only for what the active ones need a month (the third KPI).
  const [plans, goals] = await Promise.all([getSavingsPlans(activeBusinessId), getSavingsGoals(activeBusinessId)]);

  return (
    <SavingsPlansPageClient
      businessId={activeBusinessId}
      plans={plans}
      goalsMonthly={goalsHero(goals, today).monthTarget}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      today={today}
    />
  );
}
