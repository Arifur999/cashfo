import type { CategoryMove, ConcentrationNote, InsightPeriod, MonthRate, NetWorth, PeriodLabels, PeriodTotals, RankedRow } from "@/lib/customer/insights";

// What the Insights overview is told by its server page: every figure
// already derived, so the client only composes sentences and draws.
export interface InsightsData {
  businessId: string;
  currency: string;
  period: InsightPeriod;
  labels: PeriodLabels;
  // Whole months the period covers, for "a month on average".
  months: number;
  totals: PeriodTotals;
  previous: PeriodTotals;
  // Income and expense categories, biggest first.
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
  trend: { up: boolean; points: number; since: string } | null;
  worth: NetWorth;
  // How many contacts you owe money to.
  youOweCount: number;
  // Any money in or out in this or the previous period, or the last months.
  hasData: boolean;
}
