import type { ISubscriptionPlan } from "@/types/plan.types";
import type { IPlanFormValues } from "@/zod/plan.validation";

export const EMPTY_PLAN_FORM_VALUES: IPlanFormValues = {
  name: "",
  slug: "",
  billingCycle: "MONTHLY",
  price: "0",
  trialDays: "0",
  isActive: true,
  featureLimits: {
    maxWorkspaces: "1",
    maxBusinessWorkspaces: "0",
    maxTransactionsPerMonth: "50",
    advancedReports: false,
    pdfExport: false,
    multiUser: false,
    incomeGoalTracking: false,
  },
};

// API plan -> form values (numbers become the strings inputs hold).
export const toPlanFormValues = (plan: ISubscriptionPlan): IPlanFormValues => ({
  name: plan.name,
  slug: plan.slug,
  billingCycle: plan.billingCycle,
  price: String(Math.round(Number(plan.price))),
  trialDays: String(plan.trialDays),
  isActive: plan.isActive,
  featureLimits: {
    ...plan.featureLimits,
    maxWorkspaces: String(plan.featureLimits.maxWorkspaces),
    maxBusinessWorkspaces: String(plan.featureLimits.maxBusinessWorkspaces),
    maxTransactionsPerMonth: String(plan.featureLimits.maxTransactionsPerMonth),
  },
});
