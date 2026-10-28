import { redirect } from "next/navigation";
import { IEOverviewPageClient } from "@/components/modules/Customer/IncomeExpense/IEOverviewPageClient";
import { monthRange, readMonth } from "@/components/modules/Customer/IncomeExpense/ieFigures";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getCategoryBreakdown } from "@/lib/customer/reports";

export const generateMetadata = () => customerPageMetadata("/income-expense");

// Income & Expense > Overview for a month (?month=&year=, this month when
// left out): the month's totals and each kind by category.
export default async function IncomeExpenseOverviewPage({ searchParams }: PageProps<"/income-expense">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const current = appYearMonth();
  const picked = readMonth(params, current);
  if (!picked) redirect("/income-expense");
  const { dateFrom, dateTo } = monthRange(picked.year, picked.month);
  const [income, expense] = await Promise.all([
    getCategoryBreakdown(activeBusinessId, "INCOME", dateFrom, dateTo),
    getCategoryBreakdown(activeBusinessId, "EXPENSE", dateFrom, dateTo),
  ]);
  const currency = user.businesses.find((b) => b.id === activeBusinessId)?.currency ?? "BDT";

  return <IEOverviewPageClient month={picked.month} year={picked.year} current={current} income={income} expense={expense} currency={currency} />;
}
