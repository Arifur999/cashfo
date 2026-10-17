"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { notificationLogsListQuery, notificationTemplatesQuery } from "@/queries/notification.queries";
import type { INotificationLog } from "@/types/notification.types";
import { notificationLogsColumns } from "./notificationLogsColumns";
import { buildNotificationLogsTableConfig } from "./notificationLogsTable.config";

const NotificationLogsTable = () => {
  const { data: templatesResponse } = useQuery(notificationTemplatesQuery());
  const templates = useMemo(() => templatesResponse?.data ?? [], [templatesResponse]);
  const config = useMemo(() => buildNotificationLogsTableConfig(templates), [templates]);

  const { queryString, dataTableProps } = useServerDataTable<INotificationLog>(config);
  const query = useQuery({ ...notificationLogsListQuery(queryString), placeholderData: keepPreviousData });

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      data={query.data?.data}
      columns={notificationLogsColumns}
      getRowId={(row) => row.id}
      emptyMessage="No notifications match these filters."
    />
  );
};

export default NotificationLogsTable;
