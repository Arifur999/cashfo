import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getPlanAnalytics, getPlans } from "@/services/plan.services";

export const plansQuery = () =>
  queryOptions({
    queryKey: queryKeys.plans.list(),
    queryFn: () => getPlans(),
  });

// Under plans.all, so any plan mutation's invalidation refreshes it too.
export const planAnalyticsQuery = () =>
  queryOptions({
    queryKey: [...queryKeys.plans.all, "analytics"] as const,
    queryFn: () => getPlanAnalytics(),
  });
