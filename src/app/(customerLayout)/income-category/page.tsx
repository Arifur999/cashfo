import { redirect } from "next/navigation";
import { IncomeCategoryPageClient } from "@/components/modules/Customer/Budget/IncomeCategoryPageClient";
import { getCurrentUser } from "@/lib/customer/auth";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { getBudgetOverview } from "@/lib/customer/budgets";

// Dedicated income-only view -- see Sidebar.tsx's INCOME_EXPENSE_ITEMS
// comment for why this exists alongside the merged /categories page.
export default async function IncomeCategoryPage({ searchParams }: PageProps<"/income-category">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  // Dhaka's month, not the server clock's: new expenses are dated by it too.
  const { year: thisYear, month: thisMonth } = appYearMonth();
  const month = typeof params.month === "string" ? Number(params.month) || thisMonth : thisMonth;
  const year = typeof params.year === "string" ? Number(params.year) || thisYear : thisYear;

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
