import type { Metadata } from "next";
import NotificationLogsTable from "@/components/modules/Admin/Notifications/History/NotificationLogsTable";
import { NOTIFICATION_LOGS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Notifications/History/notificationLogsTable.config";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { buildTableQueryString } from "@/lib/queryString";
import { notificationLogsListQuery, notificationTemplatesQuery } from "@/queries/notification.queries";

export const metadata: Metadata = { title: "Send History" };

const SendHistoryPage = async ({ searchParams }: PageProps<"/admin/notifications/history">) => {
  const queryString = buildTableQueryString(await searchParams, NOTIFICATION_LOGS_TABLE_BASE_CONFIG);

  return (
    // Templates feed the "Template" filter.
    <QueryPrefetch
      prefetch={(client) =>
        Promise.all([client.prefetchQuery(notificationLogsListQuery(queryString)), client.prefetchQuery(notificationTemplatesQuery())])
      }
    >
      <NotificationLogsTable />
    </QueryPrefetch>
  );
};

export default SendHistoryPage;
