"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { buildTableQueryString } from "@/lib/queryString";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { OPEN_TICKET_STATUSES } from "@/lib/tickets";
import { assignableAdminsQuery, ticketsListQuery, ticketStatsQuery } from "@/queries/ticket.queries";
import type { ISupportTicket } from "@/types/ticket.types";
import { ticketsColumns } from "./ticketsColumns";
import { buildTicketsTableConfig, TICKETS_TABLE_BASE_CONFIG } from "./ticketsTable.config";

const detailHref = (row: ISupportTicket) => `/admin/support/${row.id}`;

const TicketsTable = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const admins = useQuery(assignableAdminsQuery()).data?.data;
  const statusCounts = useQuery(ticketStatsQuery()).data?.data.statusCounts;

  // The same query string the page prefetched with; the table's own config
  // waits for the admin roster and the status counts its tabs show.
  const queryString = buildTableQueryString(searchParams, TICKETS_TABLE_BASE_CONFIG);
  const query = useQuery({ ...ticketsListQuery(queryString), placeholderData: keepPreviousData });
  const config = useMemo(() => buildTicketsTableConfig(admins ?? [], statusCounts), [admins, statusCounts]);
  const { dataTableProps } = useServerDataTable<ISupportTicket>(config);

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      data={query.data?.data}
      columns={ticketsColumns}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(detailHref(row))}
      // An urgent ticket still in the queue gets the red wash.
      rowClassName={(row) => (row.priority === "URGENT" && OPEN_TICKET_STATUSES.includes(row.status) ? "bg-expense-soft/50 hover:bg-expense-soft/80" : undefined)}

      emptyMessage="No tickets match these filters."
    />
  );
};

export default TicketsTable;
