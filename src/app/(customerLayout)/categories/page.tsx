import { redirect } from "next/navigation";
import { BudgetPlanPageClient } from "@/components/modules/Customer/IncomeExpense/BudgetPlanPageClient";
import { readMonth } from "@/components/modules/Customer/IncomeExpense/ieFigures";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getMonthlyPlan, getMonthlyPlans } from "@/lib/customer/budgets";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/categories");

// Income & Expense > Budget Planning for a month (?month=&year=, this month
// when left out): its income target and expense budget, and every month
// planned so far. (Old ?tab= and ?addType= links still land here.)
export default async function BudgetPlanningPage({ searchParams }: PageProps<"/categories">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const current = appYearMonth();
  const picked = readMonth(params, current);
  if (!picked) redirect("/categories");
  const [plan, plans] = await Promise.all([getMonthlyPlan(activeBusinessId, picked.year, picked.month), getMonthlyPlans(activeBusinessId)]);
  const business = user.businesses.find((b) => b.id === activeBusinessId);

  return (
    <BudgetPlanPageClient
      businessId={activeBusinessId}
      currency={business?.currency ?? "BDT"}
      canManage={business?.role === "OWNER" || business?.role === "ACCOUNTANT"}
      plan={plan}
      month={picked.month}
      year={picked.year}
      current={current}
      plans={plans}
      today={getAppToday()}
    />
  );
}
