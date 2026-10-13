import { redirect } from "next/navigation";
import { CategoriesPageClient } from "@/components/modules/Customer/Budget/CategoriesPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { getBudgetOverview } from "@/lib/customer/budgets";

export default async function CategoriesPage({ searchParams }: PageProps<"/categories">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  // Dhaka's month, not the server clock's: new expenses are dated by it too.
  const { year: thisYear, month: thisMonth } = appYearMonth();
  const month = typeof params.month === "string" ? Number(params.month) || thisMonth : thisMonth;
  const year = typeof params.year === "string" ? Number(params.year) || thisYear : thisYear;
  const addType = params.addType === "INCOME" || params.addType === "EXPENSE" ? params.addType : null;

  const [incomeOverview, expenseOverview] = await Promise.all([
    getBudgetOverview(activeBusinessId, month, year, "INCOME"),
    getBudgetOverview(activeBusinessId, month, year, "EXPENSE"),
  ]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return (
    <CategoriesPageClient
      businessId={activeBusinessId}
      incomeOverview={incomeOverview}
      expenseOverview={expenseOverview}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      initialAddType={addType}
    />
  );
}
