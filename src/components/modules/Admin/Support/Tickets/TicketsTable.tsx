"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { assignableAdminsQuery, ticketsListQuery } from "@/queries/ticket.queries";
import type { ISupportTicket } from "@/types/ticket.types";
import CreateTicketDialog from "./CreateTicketDialog";
import { TICKETS_HIDDEN_COLUMNS, ticketsColumns } from "./ticketsColumns";
import { buildTicketsTableConfig } from "./ticketsTable.config";

const detailHref = (row: ISupportTicket) => `/admin/support/${row.id}`;

const TicketsTable = ({ canManage }: { canManage: boolean }) => {
  const router = useRouter();
  const { data: adminsResponse } = useQuery(assignableAdminsQuery());
  const admins = useMemo(() => adminsResponse?.data ?? [], [adminsResponse]);
  const config = useMemo(() => buildTicketsTableConfig(admins), [admins]);

  const { queryString, dataTableProps } = useServerDataTable<ISupportTicket>(config);
  const query = useQuery({ ...ticketsListQuery(queryString), placeholderData: keepPreviousData });

  const actions = useMemo<DataTableActions<ISupportTicket>>(() => ({ onView: (row) => router.push(detailHref(row)) }), [router]);

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      data={query.data?.data}
      columns={ticketsColumns}
      getRowId={(row) => row.id}
      tableId="tickets"
      defaultHiddenColumns={TICKETS_HIDDEN_COLUMNS}
      exportFileName="support-tickets"
      actions={actions}
      onRowClick={(row) => router.push(detailHref(row))}
      toolbarAction={canManage ? <CreateTicketDialog /> : undefined}
      emptyMessage="No tickets match these filters."
    />
  );
};

export default TicketsTable;
