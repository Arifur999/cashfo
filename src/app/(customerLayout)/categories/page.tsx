import { redirect } from "next/navigation";
import { BudgetPageClient } from "@/components/modules/Customer/Budget/BudgetPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBudgetOverview } from "@/lib/customer/budgets";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { getAppToday } from "@/lib/date";

// Budget: expense limits for the month (decision D3). Income lives on
// Income sources.
export default async function CategoriesPage({ searchParams }: PageProps<"/categories">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  // An old link into the income side goes to its own page now.
  if (params.addType === "INCOME") redirect("/income-category");

  // Dhaka's month, not the server clock's: new expenses are dated by it too.
  const { year: thisYear, month: thisMonth } = appYearMonth();
  const month = typeof params.month === "string" ? Number(params.month) || thisMonth : thisMonth;
  const year = typeof params.year === "string" ? Number(params.year) || thisYear : thisYear;

  const overview = await getBudgetOverview(activeBusinessId, month, year, "EXPENSE");
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return <BudgetPageClient businessId={activeBusinessId} overview={overview} currency={activeBusiness?.currency ?? "BDT"} canManage={canManage} openAdd={params.addType === "EXPENSE"} today={getAppToday()} />;
}
