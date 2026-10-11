"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import type { DataTableActions, DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { enumOptions } from "@/lib/statusBadge";
import { notificationTemplatesQuery } from "@/queries/notification.queries";
import { type INotificationTemplate, NOTIFICATION_CHANNELS } from "@/types/notification.types";
import TemplateForm from "./TemplateForm";
import { templatesColumns } from "./templatesColumns";

const TEMPLATE_FILTERS: DataTableFilterConfig[] = [{ id: "channel", type: "single-select", label: "Channel", options: enumOptions(NOTIFICATION_CHANNELS) }];

const TemplatesTable = ({ canManage }: { canManage: boolean }) => {
  const { data, isLoading, isFetching } = useQuery(notificationTemplatesQuery());
  const { activeRow: template, openDialog, closeDialog, getDialogProps } = useRowDialogs<INotificationTemplate, "edit">();

  const actions = useMemo<DataTableActions<INotificationTemplate> | undefined>(
    () => (canManage ? { onEdit: (row) => openDialog("edit", row) } : undefined),
    [canManage, openDialog],
  );

  return (
    <>
      <DataTable
        data={data?.data}
        columns={templatesColumns}
        getRowId={(row) => row.id}
        tableId="notification-templates"
        isLoading={isLoading}
        isFetching={isFetching}
        search={{ placeholder: "Search templates..." }}
        filters={{ configs: TEMPLATE_FILTERS }}
        exportFileName="notification-templates"
        actions={actions}
        onRowClick={canManage ? (row) => openDialog("edit", row) : undefined}
        emptyMessage="No notification templates."
      />
      <FormDialog title="Edit template" description={template?.key} size="lg" {...getDialogProps("edit")}>
        {template && <TemplateForm template={template} onDone={closeDialog} />}
      </FormDialog>
    </>
  );
};

export default TemplatesTable;
