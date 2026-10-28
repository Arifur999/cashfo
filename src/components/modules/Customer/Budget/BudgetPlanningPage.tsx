import { redirect } from "next/navigation";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getBudgetOverview } from "@/lib/customer/budgets";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { getMonthlyBreakdown } from "@/lib/customer/reports";
import { getTransactionsSummary } from "@/lib/customer/transactions";
import { getAppToday } from "@/lib/date";
import { BudgetPageClient } from "./BudgetPageClient";
import { type BudgetPath, type BudgetTab, hrefWithout, monthBounds, readBudgetMonth, sourceHistory, sourceHistoryRange } from "./budgetFigures";
import { IncomeSourcesPageClient } from "./IncomeSourcesPageClient";

interface BudgetPlanningPageProps {
  // The address the page was opened at, kept by its month switcher.
  path: BudgetPath;
  tab: BudgetTab;
  params: Record<string, string | string[] | undefined>;
}

// Budget planning (design-v4 Budget, BudgetIncome): one page with an
// Expense categories tab and an Income categories tab. /categories and
// /income-category both render it, so either menu entry opens it.
export async function BudgetPlanningPage({ path, tab, params }: BudgetPlanningPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  // Dhaka's month, not the server clock's: new entries are dated by it too.
  // A month the budget can't read (a hand-edited ?month=13) opens this one
  // rather than an empty overview of a month that doesn't exist.
  const current = appYearMonth();
  const picked = readBudgetMonth(params.month ?? String(current.month), params.year ?? String(current.year));
  if (!picked) redirect(hrefWithout(path, params, ["month", "year"]));
  const { month, year } = picked;
  const { dateFrom, dateTo } = monthBounds(year, month);
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const currency = activeBusiness?.currency ?? "BDT";

  if (tab === "expense") {
    // Every expense of the month, whatever its category: the categories'
    // own sums leave out entries with none, a deleted one's, a feature's.
    // The income side is read for its tab's count.
    const [overview, income, summary] = await Promise.all([
      getBudgetOverview(activeBusinessId, month, year, "EXPENSE"),
      getBudgetOverview(activeBusinessId, month, year, "INCOME"),
      getTransactionsSummary(activeBusinessId, { transactionType: "EXPENSE", dateFrom, dateTo }),
    ]);
    return (
      <BudgetPageClient
        businessId={activeBusinessId}
        path={path}
        overview={overview}
        counts={{ expense: overview.categories.length, income: income.categories.length }}
        monthTotal={summary ? Number(summary.totals.EXPENSE) : null}
        currency={currency}
        canManage={canManage}
        openAdd={params.addType === "EXPENSE" && canManage}
        today={getAppToday()}
      />
    );
  }

  // One read of every income category by month, uncapped: the month before
  // (for what grew) and the year so far (each card's year figure).
  const history = sourceHistoryRange(year, month, current);
  const [overview, expense, breakdown, summary] = await Promise.all([
    getBudgetOverview(activeBusinessId, month, year, "INCOME"),
    getBudgetOverview(activeBusinessId, month, year, "EXPENSE"),
    getMonthlyBreakdown(activeBusinessId, "INCOME", history.dateFrom, history.dateTo),
    // Every income of the month, whatever its category: the categories' own
    // sums leave out entries with none, a deleted one's, an asset sale's.
    getTransactionsSummary(activeBusinessId, { transactionType: "INCOME", dateFrom, dateTo }),
  ]);
  const { lastMonth, thisYear } = sourceHistory(breakdown, year, month);

  return (
    <IncomeSourcesPageClient
      businessId={activeBusinessId}
      path={path}
      overview={overview}
      counts={{ expense: expense.categories.length, income: overview.categories.length }}
      lastMonth={lastMonth}
      thisYear={thisYear}
      monthTotal={summary ? Number(summary.totals.INCOME) : null}
      currency={currency}
      canManage={canManage}
      openAdd={params.addType === "INCOME" && canManage}
      today={current}
    />
  );
}
