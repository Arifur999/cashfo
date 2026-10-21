import { redirect } from "next/navigation";
import { hrefWithout, monthBounds, readBudgetMonth, sourceHistory, sourceHistoryRange } from "@/components/modules/Customer/Budget/budgetFigures";
import { IncomeSourcesPageClient } from "@/components/modules/Customer/Budget/IncomeSourcesPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBudgetOverview } from "@/lib/customer/budgets";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getMonthlyBreakdown } from "@/lib/customer/reports";
import { getTransactionsSummary } from "@/lib/customer/transactions";

export const generateMetadata = () => customerPageMetadata("/income-category");

// Income sources: the income categories and what each brought in.
export default async function IncomeSourcesPage({ searchParams }: PageProps<"/income-category">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  // A month the API can't read (a hand-edited ?month=13) opens this one.
  const current = appYearMonth();
  const picked = readBudgetMonth(params.month ?? String(current.month), params.year ?? String(current.year));
  if (!picked) redirect(hrefWithout("/income-category", params, ["month", "year"]));
  const { month, year } = picked;
  const { dateFrom, dateTo } = monthBounds(year, month);
  // One read of every source by month, uncapped: the month before (for
  // "Growing fastest") and the year so far (its column).
  const history = sourceHistoryRange(year, month, current);

  const [overview, breakdown, summary] = await Promise.all([
    getBudgetOverview(activeBusinessId, month, year, "INCOME"),
    getMonthlyBreakdown(activeBusinessId, "INCOME", history.dateFrom, history.dateTo),
    // Every income of the month, whatever its source: the sources' own sums
    // leave out entries with none, a deleted one's, an asset sale's.
    getTransactionsSummary(activeBusinessId, { transactionType: "INCOME", dateFrom, dateTo }),
  ]);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const { lastMonth, thisYear } = sourceHistory(breakdown, year, month);

  return (
    <IncomeSourcesPageClient
      businessId={activeBusinessId}
      overview={overview}
      lastMonth={lastMonth}
      thisYear={thisYear}
      monthTotal={summary ? Number(summary.totals.INCOME) : null}
      currency={activeBusiness?.currency ?? "BDT"}
      canManage={canManage}
      openAdd={params.addType === "INCOME" && canManage}
      today={current}
    />
  );
}
