"use client";

import { useQuery } from "@tanstack/react-query";
import type { DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { enumOptions } from "@/lib/statusBadge";
import { backupsQuery } from "@/queries/system.queries";
import { BACKUP_STATUSES } from "@/types/system.types";
import { backupsColumns } from "./backupsColumns";

const BACKUP_FILTERS: DataTableFilterConfig[] = [{ id: "status", type: "multi-select", label: "Status", options: enumOptions(BACKUP_STATUSES) }];

const BackupsTable = () => {
  const { data, isLoading, isFetching } = useQuery(backupsQuery());

  return (
    <DataTable
      data={data?.data}
      columns={backupsColumns}
      getRowId={(row) => row.id}
      tableId="backups"
      isLoading={isLoading}
      isFetching={isFetching}
      filters={{ configs: BACKUP_FILTERS }}
      exportFileName="backups"
      emptyMessage="No backups recorded yet."
    />
  );
};

export default BackupsTable;
