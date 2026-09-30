import { redirect } from "next/navigation";
import { IncomeCategoryPageClient } from "@/components/budget/IncomeCategoryPageClient";
import { getCurrentUser } from "@/lib/auth";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getBudgetOverview } from "@/lib/budgets";

// Dedicated income-only view -- see Sidebar.tsx's INCOME_EXPENSE_ITEMS
// comment for why this exists alongside the merged /categories page.
export default async function IncomeCategoryPage({ searchParams }: PageProps<"/income-category">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const now = new Date();
  const month = typeof params.month === "string" ? Number(params.month) || now.getMonth() + 1 : now.getMonth() + 1;
  const year = typeof params.year === "string" ? Number(params.year) || now.getFullYear() : now.getFullYear();

  const overview = await getBudgetOverview(activeBusinessId, month, year, "INCOME");
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return (
    <IncomeCategoryPageClient
      businessId={activeBusinessId}
      overview={overview}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
    />
  );
}
