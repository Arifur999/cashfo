import { redirect } from "next/navigation";
import { BudgetPageClient } from "@/components/modules/Customer/Budget/BudgetPageClient";
import { hrefWithout, monthBounds, readBudgetMonth } from "@/components/modules/Customer/Budget/budgetFigures";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBudgetOverview } from "@/lib/customer/budgets";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getTransactionsSummary } from "@/lib/customer/transactions";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/categories");

// Budget: expense limits for the month (decision D3). Income lives on
// Income sources.
export default async function CategoriesPage({ searchParams }: PageProps<"/categories">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  // An old link into the income side goes to its own page now, still
  // asking to add one there.
  if (params.addType === "INCOME") redirect("/income-category?addType=INCOME");

  // Dhaka's month, not the server clock's: new expenses are dated by it
  // too. A month the budget can't read (a hand-edited ?month=13) opens
  // this one rather than an empty overview of a month that doesn't exist.
  const current = appYearMonth();
  const picked = readBudgetMonth(params.month ?? String(current.month), params.year ?? String(current.year));
  if (!picked) redirect(hrefWithout("/categories", params, ["month", "year"]));
  const { month, year } = picked;
  const { dateFrom, dateTo } = monthBounds(year, month);

  // Every expense of the month, whatever its category: the categories'
  // own sums leave out entries with none, a deleted one's, a feature's.
  const [overview, summary] = await Promise.all([getBudgetOverview(activeBusinessId, month, year, "EXPENSE"), getTransactionsSummary(activeBusinessId, { transactionType: "EXPENSE", dateFrom, dateTo })]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";

  return (
    <BudgetPageClient
      businessId={activeBusinessId}
      overview={overview}
      monthTotal={summary ? Number(summary.totals.EXPENSE) : null}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      openAdd={params.addType === "EXPENSE" && canManage}
      today={getAppToday()}
    />
  );
}
