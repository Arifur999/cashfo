import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getAdminAccounts } from "@/services/adminAccount.services";
import {
  getAuditLogById,
  getAuditLogs,
  getLoginAttempts,
  getLoginAttemptsSummary,
  getSecurityFlags,
} from "@/services/security.services";

export const auditLogsListQuery = (queryString: string) =>
  queryOptions({
    queryKey: queryKeys.auditLogs.list(queryString),
    queryFn: () => getAuditLogs(queryString),
  });

export const auditLogDetailQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.auditLogs.detail(id),
    queryFn: () => getAuditLogById(id),
  });

export const loginAttemptsListQuery = (queryString: string) =>
  queryOptions({
    queryKey: queryKeys.loginAttempts.list(queryString),
    queryFn: () => getLoginAttempts(queryString),
  });

// Under loginAttempts.all, so refreshing the list refreshes the counters.
export const loginAttemptsSummaryQuery = () =>
  queryOptions({
    queryKey: [...queryKeys.loginAttempts.all, "summary"] as const,
    queryFn: () => getLoginAttemptsSummary(),
  });

export const securityFlagsQuery = () =>
  queryOptions({
    queryKey: queryKeys.securityFlags.list(),
    queryFn: () => getSecurityFlags(),
  });

export const adminAccountsQuery = () =>
  queryOptions({
    queryKey: queryKeys.admins.list(),
    queryFn: () => getAdminAccounts(),
  });
