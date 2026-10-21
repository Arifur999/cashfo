"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { notificationLogsListQuery, notificationTemplatesQuery } from "@/queries/notification.queries";
import type { INotificationLog } from "@/types/notification.types";
import { notificationLogsColumns } from "./notificationLogsColumns";
import { buildNotificationLogsTableConfig, hasLogFilters } from "./notificationLogsTable.config";

const NotificationLogsTable = () => {
  const searchParams = useSearchParams();
  const { data: templatesResponse } = useQuery(notificationTemplatesQuery());
  const templates = useMemo(() => templatesResponse?.data ?? [], [templatesResponse]);
  const config = useMemo(() => buildNotificationLogsTableConfig(templates), [templates]);

  const { queryString, dataTableProps } = useServerDataTable<INotificationLog>(config);
  const query = useQuery({ ...notificationLogsListQuery(queryString), placeholderData: keepPreviousData });

  return (
    <DataTable
      {...dataTableProps}
      // An outage isn't "nothing sent": the table says the history didn't
      // load, with Try again, while its filters stay to change back.
      {...toTableQueryProps(query)}
      errorTitle="Couldn't load the send history"
      errorDescription="Try again in a moment."
      data={query.data?.data}
      columns={notificationLogsColumns}
      // The grid's columns keep their px on a phone, so a badge or a
      // template key isn't crushed; the recipient gives way, then it scrolls.
      // The minimum (about 920px) still fits a 1280px laptop's card.
      layout={{ flexMinWidth: 160 }}
      getRowId={(row) => row.id}
      emptyMessage={hasLogFilters(searchParams) ? "No notifications match these filters." : "Nothing has been sent yet."}
    />
  );
};

export default NotificationLogsTable;
