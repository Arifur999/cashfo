import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getCohorts, getDevices, getEngagement, getFeatureUsage, getGeography } from "@/services/analytics.services";

const { all } = queryKeys.analytics;

// Reports are aggregates that move slowly; no need to refetch on every focus.
const ANALYTICS_STALE_TIME = 5 * 60 * 1000;

export const featureUsageQuery = (rangeQuery: string) =>
  queryOptions({
    queryKey: [...all, "feature-usage", rangeQuery] as const,
    queryFn: () => getFeatureUsage(rangeQuery),
    staleTime: ANALYTICS_STALE_TIME,
  });

export const engagementQuery = (rangeQuery: string) =>
  queryOptions({
    queryKey: [...all, "engagement", rangeQuery] as const,
    queryFn: () => getEngagement(rangeQuery),
    staleTime: ANALYTICS_STALE_TIME,
  });

export const cohortsQuery = () =>
  queryOptions({
    queryKey: [...all, "cohorts"] as const,
    queryFn: () => getCohorts(),
    staleTime: ANALYTICS_STALE_TIME,
  });

export const geographyQuery = () =>
  queryOptions({
    queryKey: [...all, "geography"] as const,
    queryFn: () => getGeography(),
    staleTime: ANALYTICS_STALE_TIME,
  });

export const devicesQuery = () =>
  queryOptions({
    queryKey: [...all, "devices"] as const,
    queryFn: () => getDevices(),
    staleTime: ANALYTICS_STALE_TIME,
  });
