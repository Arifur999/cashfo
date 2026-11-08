import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getAnalyticsSummary, getCohorts, getDevices, getEngagement, getEngagementByMonth, getFeatureUsage, getGeography } from "@/services/analytics.services";

const { all } = queryKeys.analytics;

// Reports are aggregates that move slowly; no need to refetch on every focus.
const ANALYTICS_STALE_TIME = 5 * 60 * 1000;

// Every report is for the period the page shows ("from=…&to=…").
export const analyticsSummaryQuery = (rangeQuery: string) =>
  queryOptions({ queryKey: [...all, "summary", rangeQuery] as const, queryFn: () => getAnalyticsSummary(rangeQuery), staleTime: ANALYTICS_STALE_TIME });

export const featureUsageQuery = (rangeQuery: string) =>
  queryOptions({ queryKey: [...all, "feature-usage", rangeQuery] as const, queryFn: () => getFeatureUsage(rangeQuery), staleTime: ANALYTICS_STALE_TIME });

export const engagementQuery = (rangeQuery: string) =>
  queryOptions({ queryKey: [...all, "engagement", rangeQuery] as const, queryFn: () => getEngagement(rangeQuery), staleTime: ANALYTICS_STALE_TIME });

export const engagementByMonthQuery = (rangeQuery: string) =>
  queryOptions({ queryKey: [...all, "engagement-month", rangeQuery] as const, queryFn: () => getEngagementByMonth(rangeQuery), staleTime: ANALYTICS_STALE_TIME });

export const cohortsQuery = (rangeQuery: string) =>
  queryOptions({ queryKey: [...all, "cohorts", rangeQuery] as const, queryFn: () => getCohorts(rangeQuery), staleTime: ANALYTICS_STALE_TIME });

export const geographyQuery = (rangeQuery: string) =>
  queryOptions({ queryKey: [...all, "geography", rangeQuery] as const, queryFn: () => getGeography(rangeQuery), staleTime: ANALYTICS_STALE_TIME });

export const devicesQuery = (rangeQuery: string) =>
  queryOptions({ queryKey: [...all, "devices", rangeQuery] as const, queryFn: () => getDevices(rangeQuery), staleTime: ANALYTICS_STALE_TIME });
