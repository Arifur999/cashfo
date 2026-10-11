import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getCampaigns, getNotificationLogs, getNotificationTemplates } from "@/services/notification.services";

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
