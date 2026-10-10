export interface IRevenueByPlanEntry {
  planId: string;
  planName: string;
  amount: number;
}

export interface IRevenueTrendPoint {
  // "2026-10"
  month: string;
  amount: number;
}

export interface IRevenueSummary {
  totalRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  mrr: number;
  revenueByPlan: IRevenueByPlanEntry[];
  revenueTrend: IRevenueTrendPoint[];
}

export interface IChurnData {
  churnedThisMonth: number;
  startOfMonthPaidCount: number;
  currentPaidCount: number;
  churnRatePercent: number;
}
