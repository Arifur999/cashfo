export const BILLING_CYCLES = ["FREE", "MONTHLY", "YEARLY"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

// -1 means unlimited for the numeric limits.
export interface IFeatureLimits {
  maxWorkspaces: number;
  maxBusinessWorkspaces: number;
  maxTransactionsPerMonth: number;
  advancedReports: boolean;
  pdfExport: boolean;
  multiUser: boolean;
  incomeGoalTracking: boolean;
}

// `price` is a Decimal, so it arrives as a fixed-2dp string.
export interface ISubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  billingCycle: BillingCycle;
  price: string;
  currency: string;
  trialDays: number;
  isActive: boolean;
  featureLimits: IFeatureLimits;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type IPlanOption = Pick<ISubscriptionPlan, "id" | "name" | "slug">;

export interface IPlanAnalyticsEntry {
  planId: string;
  planName: string;
  billingCycle: BillingCycle;
  totalUsers: number;
  activeUsers: number;
  // Workspaces on the plan whose trial is still running.
  trialing: number;
  revenueEstimate: number;
}

// How many different people were still inside a paid period of each plan
// at the end of a month ('YYYY-MM'), keyed by plan id.
export interface IPlanHistoryMonth {
  month: string;
  perPlan: Record<string, number>;
}

export interface IPlanAnalytics {
  perPlan: IPlanAnalyticsEntry[];
  // The last six months, oldest first.
  history: IPlanHistoryMonth[];
  summary: {
    totalUsers: number;
    freeUsers: number;
    paidUsers: number;
    freePercentage: number;
    paidPercentage: number;
    totalRevenueEstimate: number;
  };
}

export interface IPlanPayload {
  name: string;
  slug: string;
  billingCycle: BillingCycle;
  price: number;
  trialDays: number;
  featureLimits: IFeatureLimits;
  isActive?: boolean;
}
