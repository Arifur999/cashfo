import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getFeatureFlags } from "@/services/featureFlag.services";
import { getBackups, getBackupStatusSummary, getErrorLogs, getRateLimitLogs, getRateLimitSummary } from "@/services/system.services";

export const backupsQuery = () =>
  queryOptions({
    queryKey: queryKeys.backups.list(),
    queryFn: () => getBackups(),
  });

export const backupStatusSummaryQuery = () =>
  queryOptions({
    queryKey: [...queryKeys.backups.all, "summary"] as const,
    queryFn: () => getBackupStatusSummary(),
  });

export const featureFlagsQuery = () =>
  queryOptions({
    queryKey: queryKeys.featureFlags.list(),
    queryFn: () => getFeatureFlags(),
  });

export const errorLogsListQuery = (queryString: string) =>
  queryOptions({
    queryKey: queryKeys.errorLogs.list(queryString),
    queryFn: () => getErrorLogs(queryString),
  });

export const rateLimitLogsListQuery = (queryString: string) =>
  queryOptions({
    queryKey: queryKeys.rateLimits.list(queryString),
    queryFn: () => getRateLimitLogs(queryString),
  });

export const rateLimitSummaryQuery = () =>
  queryOptions({
    queryKey: [...queryKeys.rateLimits.all, "summary"] as const,
    queryFn: () => getRateLimitSummary(),
  });
