import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getCampaignAudience, getCampaigns, getNotificationLogs, getNotificationLogStats, getNotificationTemplates } from "@/services/notification.services";
import type { ICampaignTargetFilter } from "@/types/notification.types";

// "About N people match right now", as the drawer's filter changes.
export const campaignAudienceQuery = (filter: ICampaignTargetFilter) =>
  queryOptions({
    queryKey: [...queryKeys.campaigns.all, "audience", filter] as const,
    queryFn: () => getCampaignAudience(filter),
    staleTime: 60 * 1000,
  });

// Under notificationLogs.all, so it refreshes with the history.
export const notificationLogStatsQuery = () =>
  queryOptions({
    queryKey: [...queryKeys.notificationLogs.all, "stats"] as const,
    queryFn: () => getNotificationLogStats(),
  });

export const notificationTemplatesQuery = () =>
  queryOptions({
    queryKey: queryKeys.notificationTemplates.list(),
    queryFn: () => getNotificationTemplates(),
  });

export const notificationLogsListQuery = (queryString: string) =>
  queryOptions({
    queryKey: queryKeys.notificationLogs.list(queryString),
    queryFn: () => getNotificationLogs(queryString),
  });

export const campaignsQuery = () =>
  queryOptions({
    queryKey: queryKeys.campaigns.list(),
    queryFn: () => getCampaigns(),
  });
