import { redirect } from "next/navigation";
import { InsightsOverviewPageClient } from "@/components/modules/Customer/Insights/InsightsOverviewPageClient";
import type { InsightsData } from "@/components/modules/Customer/Insights/insightsTypes";
import { getWalletsOverview } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { assetsSummary } from "@/lib/customer/assetDisplay";
import { getAssets } from "@/lib/customer/assets";
import { getCurrentUser } from "@/lib/customer/auth";
import { appYearMonth, resolveDateRange } from "@/lib/customer/dateRangePresets";
import { loanCounts } from "@/lib/customer/homeInsights";
import { biggestDrop, categoryMoves, concentrationNote, insightPeriodFrom, monthRates, monthSpan, netWorth, periodLabels, periodTotals, previousRange, rankedRows, rateTrend } from "@/lib/customer/insights";
import { getLoanDashboard } from "@/lib/customer/receivablesPayables";
import { getCategoryBreakdown, getMonthlyBreakdown } from "@/lib/customer/reports";
import { getSavingsAccountOverview } from "@/lib/customer/savingsGoals";
import { getAppToday } from "@/lib/date";
import { getLocale } from "@/lib/i18n/locale";

const pad = (n: number) => String(n).padStart(2, "0");

// Insights › Overview: the sentences are derived here, on the server, from
// the same calls the Reports, Home and Loans pages already make.
export default async function InsightsOverviewPage({ searchParams }: PageProps<"/reports/overview">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const locale = await getLocale();
  const period = insightPeriodFrom(params.period);
  const resolved = resolveDateRange(period);
  const range = { dateFrom: resolved.dateFrom!, dateTo: resolved.dateTo! };
  const previous = previousRange(range, period);

  // The last six months for the rate chart, this one included.
  const { year, month } = appYearMonth();
  const sixAgo = new Date(Date.UTC(year, month - 6, 1));
  const sixFrom = `${sixAgo.getUTCFullYear()}-${pad(sixAgo.getUTCMonth() + 1)}-01`;

  const [income, expense, prevIncome, prevExpense, monthlyIncome, monthlyExpense, wallets, savings, assets, loans] = await Promise.all([
    getCategoryBreakdown(activeBusinessId, "INCOME", range.dateFrom, range.dateTo),
    getCategoryBreakdown(activeBusinessId, "EXPENSE", range.dateFrom, range.dateTo),
    getCategoryBreakdown(activeBusinessId, "INCOME", previous.dateFrom, previous.dateTo),
    getCategoryBreakdown(activeBusinessId, "EXPENSE", previous.dateFrom, previous.dateTo),
    getMonthlyBreakdown(activeBusinessId, "INCOME", sixFrom, getAppToday()),
    getMonthlyBreakdown(activeBusinessId, "EXPENSE", sixFrom, getAppToday()),
    getWalletsOverview(activeBusinessId),
    getSavingsAccountOverview(activeBusinessId),
    getAssets(activeBusinessId),
    getLoanDashboard(activeBusinessId),
  ]);

  const totals = periodTotals(income, expense);
  const previousTotals = periodTotals(prevIncome, prevExpense);
  const rates = monthRates(monthlyIncome, monthlyExpense);
  const moves = categoryMoves(expense, prevExpense);

  const data: InsightsData = {
    businessId: activeBusinessId,
    currency,
    period,
    labels: periodLabels(range, previous, period, locale),
    months: monthSpan(range),
    totals,
    previous: previousTotals,
    sources: rankedRows(income),
    spend: rankedRows(expense),
    concentration: concentrationNote(income, prevIncome),
    drop: biggestDrop(expense, prevExpense),
    biggestMove: moves.find((m) => m.change !== 0) ?? null,
    rates,
    trend: rateTrend(rates),
    worth: netWorth({
      wallets: Number(wallets.totalBalance),
      savings: Number(savings.totalBalance),
      assets: assetsSummary(assets).totalValue,
      owedToYou: Number(loans.totalPawna),
      youOwe: Number(loans.totalDena),
    }),
    youOweCount: loanCounts(loans.rows).youOwe,
    hasData: totals.income + totals.expense + previousTotals.income + previousTotals.expense > 0 || rates.some((r) => r.income > 0 || r.expense > 0),
  };

  return <InsightsOverviewPageClient data={data} />;
}
