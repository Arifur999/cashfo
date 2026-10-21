import type { CategoryMove, ConcentrationNote, DayRange, InsightPeriod, MonthRate, PeriodLabels, PeriodTotals, RankedRow, RateTrend } from "@/lib/customer/insights";

// What the Insights overview is told by its server page: every figure
// already derived, so the client only composes sentences and draws. Net
// worth comes separately, from the overview's layout (InsightsSlots).
export interface InsightsData {
  businessId: string;
  currency: string;
  period: InsightPeriod;
  // The days the period covers, for the links into Transactions.
  range: DayRange;
  labels: PeriodLabels;
  // Months the period covers, the one under way by its share of days, for
  // "a month on average".
  months: number;
  totals: PeriodTotals;
  previous: PeriodTotals;
  // Income and expense categories, biggest first, every one of them.
  sources: RankedRow[];
  spend: RankedRow[];
  // One source over 60% of the money in.
  concentration: ConcentrationNote | null;
  // The biggest fall in spending against the previous period.
  drop: CategoryMove | null;
  // The biggest move either way, for the changes table.
  biggestMove: CategoryMove | null;
  // The last six months, oldest first.
  rates: MonthRate[];
  // Read from the finished months only.
  trend: RateTrend | null;
  // The month under way ("YYYY-MM"), null once it is over: the charts draw
  // it apart and say "so far", since its salary is in but not all of its
  // spending yet.
  partialMonth: string | null;
  // Any money in or out in this or the previous period, or the last months.
  hasData: boolean;
}
