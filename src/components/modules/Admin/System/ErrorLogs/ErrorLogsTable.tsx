"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import { useMemo } from "react";
import { resolveErrorAction } from "@/app/(dashboardLayout)/admin/system/errors/_action";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { queryKeys } from "@/lib/queryKeys";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { errorLogsListQuery } from "@/queries/system.queries";
import type { IErrorLog } from "@/types/system.types";
import ErrorLogDialog from "./ErrorLogDialog";
import { errorLogsColumns } from "./errorLogsColumns";
import { ERROR_LOGS_TABLE_CONFIG } from "./errorLogsTable.config";

const ErrorLogsTable = () => {
  const { queryString, dataTableProps } = useServerDataTable<IErrorLog>(ERROR_LOGS_TABLE_CONFIG);
  const query = useQuery({ ...errorLogsListQuery(queryString), placeholderData: keepPreviousData });
  const { activeRow, openDialog, closeDialog, getDialogProps } = useRowDialogs<IErrorLog, "details">();

  const { run: resolve, isPending: isResolving } = useActionMutation({
    action: resolveErrorAction,
    successMessage: "Marked resolved",
    invalidateKeys: [queryKeys.errorLogs.all],
    refreshRoute: false,
  });

  const actions = useMemo<DataTableActions<IErrorLog>>(
    () => ({
      onView: (row) => openDialog("details", row),
      extra: [{ label: "Mark resolved", icon: CheckCheck, onClick: (row) => void resolve(row.id), hidden: (row) => row.resolved }],
    }),
    [openDialog, resolve],
  );

  return (
    <>
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        data={query.data?.data}
        columns={errorLogsColumns}
        getRowId={(row) => row.id}
        tableId="error-logs"
        exportFileName="error-logs"
        actions={actions}
        onRowClick={(row) => openDialog("details", row)}
        emptyMessage="No errors match these filters."
      />
      <ErrorLogDialog
        error={activeRow}
        {...getDialogProps("details")}
        isResolving={isResolving}
        onResolve={async (error) => {
          if (await resolve(error.id)) closeDialog();
        }}
      />
    </>
  );
};

export default ErrorLogsTable;
