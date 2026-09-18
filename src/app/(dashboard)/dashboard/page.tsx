import { redirect } from "next/navigation";
import { getWalletsOverview } from "@/lib/accounts";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getAssetsAction } from "@/lib/assetActions";
import { getCurrentUser } from "@/lib/auth";
import { DashboardPageClient } from "@/components/dashboard/DashboardPageClient";
import { resolveDateRange } from "@/lib/dateRangePresets";
import { getLoanDashboard } from "@/lib/receivablesPayables";
import { getCategoryBreakdown, getIncomeVsSavingsTrend } from "@/lib/reports";
import { getSavingsOverview } from "@/lib/savingsGoals";
import { getTransactions } from "@/lib/transactions";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const { dateFrom, dateTo } = resolveDateRange("this-month");

  const [walletsOverview, monthIncome, monthExpense, savingsOverview, loanDashboard, recentTransactions, trendPoints, assetsResult] =
    await Promise.all([
      getWalletsOverview(activeBusinessId),
      getCategoryBreakdown(activeBusinessId, "INCOME", dateFrom, dateTo),
      getCategoryBreakdown(activeBusinessId, "EXPENSE", dateFrom, dateTo),
      getSavingsOverview(activeBusinessId),
      getLoanDashboard(activeBusinessId),
      getTransactions(activeBusinessId, { limit: 5 }),
      getIncomeVsSavingsTrend(activeBusinessId, 6),
      getAssetsAction(activeBusinessId),
    ]);

  const totalAssets = (assetsResult.data ?? [])
    .filter((a) => a.status === "ACTIVE")
    .reduce((sum, a) => sum + Number(a.currentValue), 0);

  return (
    <DashboardPageClient
      businessId={activeBusinessId}
      businessName={activeBusiness?.name ?? "..."}
      userName={user.name}
      currency={currency}
      totalBalance={walletsOverview.totalBalance}
      monthIncome={monthIncome.total}
      monthExpense={monthExpense.total}
      totalSaved={savingsOverview.totalSaved}
      savingsTarget={savingsOverview.totalGoals}
      savingsProgressPercent={savingsOverview.progressPercent}
      totalAssets={totalAssets.toFixed(2)}
      loanDashboard={loanDashboard}
      recentTransactions={recentTransactions.data}
      trendPoints={trendPoints}
    />
  );
}
