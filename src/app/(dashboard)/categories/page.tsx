import { redirect } from "next/navigation";
import { CategoriesPageClient } from "@/components/budget/CategoriesPageClient";
import { getCurrentUser } from "@/lib/auth";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getBudgetOverview } from "@/lib/budgets";

export default async function CategoriesPage({ searchParams }: PageProps<"/categories">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const now = new Date();
  const month = typeof params.month === "string" ? Number(params.month) || now.getMonth() + 1 : now.getMonth() + 1;
  const year = typeof params.year === "string" ? Number(params.year) || now.getFullYear() : now.getFullYear();
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
