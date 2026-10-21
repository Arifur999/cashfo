import { redirect } from "next/navigation";
import { InsightsOverviewPageClient } from "@/components/modules/Customer/Insights/InsightsOverviewPageClient";
import type { InsightsData } from "@/components/modules/Customer/Insights/insightsTypes";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { appYearMonth, resolveDateRange } from "@/lib/customer/dateRangePresets";
import {
  biggestDrop,
  categoryMoves,
  categoryTotals,
  completeMonths,
  concentrationNote,
  insightPeriodFrom,
  monthRates,
  monthsElapsed,
  monthUnderWay,
  periodLabels,
  periodTotals,
  previousRange,
  rankedRows,
  rateTrend,
} from "@/lib/customer/insights";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getMonthlyBreakdown } from "@/lib/customer/reports";
import { getAppToday } from "@/lib/date";
import { getLocale } from "@/lib/i18n/locale";

export const generateMetadata = () => customerPageMetadata("/reports/overview");

const pad = (n: number) => String(n).padStart(2, "0");

// Insights › Overview: the sentences are derived here, on the server, from
// the same calls the Reports page makes. Net worth streams in from the
// layout beside it, so a period switch only waits for these.
export default async function InsightsOverviewPage({ searchParams }: PageProps<"/reports/overview">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const locale = await getLocale();
  const today = getAppToday();
  const period = insightPeriodFrom(params.period);
  const resolved = resolveDateRange(period);
  const range = { dateFrom: resolved.dateFrom!, dateTo: resolved.dateTo! };
  // The same days one step back: 1–21 Sep against 1–21 Oct, never all of Sep.
  const previous = previousRange(range, period);

  // The last six months for the rate charts, this one included.
  const { year, month } = appYearMonth();
  const sixAgo = new Date(Date.UTC(year, month - 6, 1));
  const sixFrom = `${sixAgo.getUTCFullYear()}-${pad(sixAgo.getUTCMonth() + 1)}-01`;

  // Monthly breakdowns, not the category breakdown: they carry every
  // category, where that one stops at the ten biggest.
  const [income, expense, prevIncome, prevExpense, monthlyIncome, monthlyExpense] = await Promise.all([
    getMonthlyBreakdown(activeBusinessId, "INCOME", range.dateFrom, range.dateTo),
    getMonthlyBreakdown(activeBusinessId, "EXPENSE", range.dateFrom, range.dateTo),
    getMonthlyBreakdown(activeBusinessId, "INCOME", previous.dateFrom, previous.dateTo),
    getMonthlyBreakdown(activeBusinessId, "EXPENSE", previous.dateFrom, previous.dateTo),
    getMonthlyBreakdown(activeBusinessId, "INCOME", sixFrom, today),
    getMonthlyBreakdown(activeBusinessId, "EXPENSE", sixFrom, today),
  ]);

  const current = { income: categoryTotals(income), expense: categoryTotals(expense) };
  const before = { income: categoryTotals(prevIncome), expense: categoryTotals(prevExpense) };
  const totals = periodTotals(current.income, current.expense);
  const previousTotals = periodTotals(before.income, before.expense);
  const rates = monthRates(monthlyIncome, monthlyExpense);
  const moves = categoryMoves(current.expense, before.expense);

  const data: InsightsData = {
    businessId: activeBusinessId,
    currency,
    period,
    range,
    labels: periodLabels(range, previous, period, locale),
    months: monthsElapsed(range),
    totals,
    previous: previousTotals,
    sources: rankedRows(current.income),
    spend: rankedRows(current.expense),
    concentration: concentrationNote(current.income, before.income),
    drop: biggestDrop(current.expense, before.expense),
    biggestMove: moves.find((m) => m.change !== 0) ?? null,
    rates,
    // A month under way has its salary but not all its spending yet.
    trend: rateTrend(completeMonths(rates, today)),
    partialMonth: monthUnderWay(rates, today),
    hasData: totals.income + totals.expense + previousTotals.income + previousTotals.expense > 0 || rates.some((r) => r.income > 0 || r.expense > 0),
  };

  return <InsightsOverviewPageClient data={data} />;
}
