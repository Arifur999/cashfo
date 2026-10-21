"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import ErrorState from "@/components/smartly/ErrorState";
import { Button } from "@/components/ui/button";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { notificationLogsListQuery, notificationTemplatesQuery } from "@/queries/notification.queries";
import type { INotificationLog } from "@/types/notification.types";
import { notificationLogsColumns } from "./notificationLogsColumns";
import { buildNotificationLogsTableConfig, hasLogFilters } from "./notificationLogsTable.config";

const NotificationLogsTable = () => {
  const { translate } = useLocale();
  const searchParams = useSearchParams();
  const { data: templatesResponse } = useQuery(notificationTemplatesQuery());
  const templates = useMemo(() => templatesResponse?.data ?? [], [templatesResponse]);
  const config = useMemo(() => buildNotificationLogsTableConfig(templates), [templates]);

  const { queryString, dataTableProps } = useServerDataTable<INotificationLog>(config);
  const query = useQuery({ ...notificationLogsListQuery(queryString), placeholderData: keepPreviousData });

  // An outage isn't "nothing sent": say the history didn't load, and offer
  // to drop a filter the API refuses.
  if (query.isError && !query.data) {
    return (
      <ErrorState
        title={translate("Couldn't load the send history")}
        description={translate("Try again in a moment.")}
        onRetry={() => void query.refetch()}
        secondaryAction={
          hasLogFilters(searchParams) ? (
            <Button asChild variant="secondary">
              <Link href="/admin/notifications/history">{translate("Clear filters")}</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      data={query.data?.data}
      columns={notificationLogsColumns}
      getRowId={(row) => row.id}
      emptyMessage={hasLogFilters(searchParams) ? "No notifications match these filters." : "Nothing has been sent yet."}
    />
  );
};

export default NotificationLogsTable;
