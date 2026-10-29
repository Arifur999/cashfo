import { redirect } from "next/navigation";
import { IEOverviewPageClient } from "@/components/modules/Customer/IncomeExpense/IEOverviewPageClient";
import { periodRange, readPeriod } from "@/components/modules/Customer/IncomeExpense/ieFigures";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getActiveMonths, getCategoryBreakdown } from "@/lib/customer/reports";

export const generateMetadata = () => customerPageMetadata("/income-expense");

// Income & Expense > Overview for a period: a month (?month=&year=, this
// month when left out), a year (?period=year&year=) or any days (?from=&to=);
// its totals and each kind by category.
export default async function IncomeExpenseOverviewPage({ searchParams }: PageProps<"/income-expense">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const current = appYearMonth();
  const period = readPeriod(params, current);
  if (!period) redirect("/income-expense");
  const { dateFrom, dateTo } = periodRange(period);
  const [income, expense, activeMonths] = await Promise.all([
    getCategoryBreakdown(activeBusinessId, "INCOME", dateFrom, dateTo),
    getCategoryBreakdown(activeBusinessId, "EXPENSE", dateFrom, dateTo),
    getActiveMonths(activeBusinessId),
  ]);
  const currency = user.businesses.find((b) => b.id === activeBusinessId)?.currency ?? "BDT";

  return <IEOverviewPageClient period={period} current={current} activeMonths={activeMonths} income={income} expense={expense} currency={currency} />;
}
