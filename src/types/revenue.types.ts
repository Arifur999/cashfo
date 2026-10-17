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

export interface IMrrHistoryPoint {
  // "2026-10"
  month: string;
  mrr: number;
}

export interface IRevenueByPlanMonth {
  planId: string;
  planName: string;
  payments: number;
  amount: string;
}

// The Revenue page, in one read. Money is a fixed-2dp string where it comes
// from a sum of payments, a number where it is the live MRR.
export interface IRevenueOverview {
  month: string;
  mrr: number;
  arr: number;
  mrrChangePct: number | null;
  paidPeople: { now: number; joinedThisMonth: number; leftThisMonth: number };
  churn: IChurnData;
  mrrHistory: IMrrHistoryPoint[];
  byPlan: IRevenueByPlanMonth[];
  thisMonthTotal: string;
  refundsThisMonth: { count: number; amount: string };
  couponsCostThisMonth: string;
}

export interface IChurnData {
  churnedThisMonth: number;
  startOfMonthPaidCount: number;
  currentPaidCount: number;
  churnRatePercent: number;
}
