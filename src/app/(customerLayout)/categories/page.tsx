import { redirect } from "next/navigation";
import { BudgetPlanPageClient } from "@/components/modules/Customer/IncomeExpense/BudgetPlanPageClient";
import { planMonthToShow, readMonth } from "@/components/modules/Customer/IncomeExpense/ieFigures";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getMonthlyPlans } from "@/lib/customer/budgets";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/categories");

// Income & Expense > Budget Planning (?month=&year=, this month when left
// out): every month planned, the one shown in the figures above them, and
// a word when the month asked for has no plan yet. (Old ?tab= and ?addType=
// links still land here.)
export default async function BudgetPlanningPage({ searchParams }: PageProps<"/categories">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const current = appYearMonth();
  const asked = readMonth(params, current);
  if (!asked) redirect("/categories");
  // Each plan carries its month's income and spending.
  const plans = (await getMonthlyPlans(activeBusinessId)).filter((plan) => plan.id !== null);
  const { shown, missing } = planMonthToShow(plans, asked, current, typeof params.month === "string" || typeof params.year === "string");
  const business = user.businesses.find((b) => b.id === activeBusinessId);

  return (
    <BudgetPlanPageClient
      businessId={activeBusinessId}
      currency={business?.currency ?? "BDT"}
      canManage={business?.role === "OWNER" || business?.role === "ACCOUNTANT"}
      plans={plans}
      shown={shown}
      missing={missing}
      current={current}
      today={getAppToday()}
    />
  );
}
