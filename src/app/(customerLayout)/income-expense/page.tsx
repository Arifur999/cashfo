import { redirect } from "next/navigation";
import { IEOverviewPageClient } from "@/components/modules/Customer/IncomeExpense/IEOverviewPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { type Period, periodRange, readPickedPeriod } from "@/lib/customer/period";
import { getActiveMonths, getCategoryBreakdown } from "@/lib/customer/reports";
import { getAppToday } from "@/lib/date";

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
  const thisMonth: Period = { kind: "month", ...current };
  // The Overview has no "all time": anything else it can't read is this month.
  const picked = readPickedPeriod(params, current, thisMonth);
  const period = picked.kind === "all" ? thisMonth : picked;
  const { dateFrom, dateTo } = periodRange(period);
  const [income, expense, activeMonths] = await Promise.all([
    getCategoryBreakdown(activeBusinessId, "INCOME", dateFrom, dateTo),
    getCategoryBreakdown(activeBusinessId, "EXPENSE", dateFrom, dateTo),
    getActiveMonths(activeBusinessId),
  ]);
  const business = user.businesses.find((b) => b.id === activeBusinessId);
  const canManage = business?.role === "OWNER" || business?.role === "ACCOUNTANT";

  return (
    <IEOverviewPageClient
      period={period}
      current={current}
      today={getAppToday()}
      activeMonths={activeMonths}
      income={income}
      expense={expense}
      currency={business?.currency ?? "BDT"}
      canManage={canManage}
    />
  );
}
