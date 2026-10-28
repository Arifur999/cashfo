import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getAdminAccounts, getAdminInvites } from "@/services/adminAccount.services";
import { getAuditLogs, getLoginAttempts, getLoginAttemptsSummary, getSecurityFlags, getSecurityFlagsSummary } from "@/services/security.services";

// The log, a page at a time. A single entry is read through
// lookupAuditEntryAction (security/(sections)/_action.ts), which tells "no
// such entry" (a 404) from a call that failed.
export const auditLogsListQuery = (queryString: string) =>
  queryOptions({
    queryKey: queryKeys.auditLogs.list(queryString),
    queryFn: () => getAuditLogs(queryString),
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

// Under securityFlags.all, so a review or a check refreshes the tab count.
export const securityFlagsSummaryQuery = () =>
  queryOptions({
    queryKey: [...queryKeys.securityFlags.all, "summary"] as const,
    queryFn: () => getSecurityFlagsSummary(),
  });

export const adminAccountsQuery = () =>
  queryOptions({
    queryKey: queryKeys.admins.list(),
    queryFn: () => getAdminAccounts(),
  });

// Invites still open, under admins.all, so whatever refreshes the team
// refreshes them too.
export const adminInvitesQuery = () =>
  queryOptions({
    queryKey: [...queryKeys.admins.all, "invites"] as const,
    queryFn: () => getAdminInvites(),
  });
