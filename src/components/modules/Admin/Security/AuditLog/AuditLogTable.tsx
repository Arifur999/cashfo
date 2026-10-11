"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { adminAccountsQuery, auditLogsListQuery } from "@/queries/security.queries";
import type { IAuditLogEntry } from "@/types/auditLog.types";
import { auditLogColumns } from "./auditLogColumns";
import { buildAuditLogTableConfig } from "./auditLogTable.config";

const detailHref = (row: IAuditLogEntry) => `/admin/security/${row.id}`;

const AuditLogTable = () => {
  const router = useRouter();
  const { data: adminsResponse } = useQuery(adminAccountsQuery());
  const admins = useMemo(() => adminsResponse?.data ?? [], [adminsResponse]);
  const config = useMemo(() => buildAuditLogTableConfig(admins), [admins]);

  const { queryString, dataTableProps } = useServerDataTable<IAuditLogEntry>(config);
  const query = useQuery({ ...auditLogsListQuery(queryString), placeholderData: keepPreviousData });

  const actions = useMemo<DataTableActions<IAuditLogEntry>>(() => ({ onView: (row) => router.push(detailHref(row)) }), [router]);

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      data={query.data?.data}
      columns={auditLogColumns}
      getRowId={(row) => row.id}
      tableId="audit-log"
      exportFileName="audit-log"
      actions={actions}
      onRowClick={(row) => router.push(detailHref(row))}
      emptyMessage="No audit entries match these filters."
    />
  );
};

export default AuditLogTable;
