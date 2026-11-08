"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { OPEN_TICKET_STATUSES } from "@/lib/tickets";
import { assignableAdminsQuery, ticketsListQuery, ticketStatsQuery } from "@/queries/ticket.queries";
import type { ISupportTicket } from "@/types/ticket.types";
import { hasTicketFilters, ticketHref } from "../ticketLinks";
import { isNewTicket, ticketsColumns } from "./ticketsColumns";
import { buildTicketsTableConfig, ticketsQueryString } from "./ticketsTable.config";

// The queue. currentAdminId puts the reader first in the Assigned filter.
const TicketsTable = ({ currentAdminId }: { currentAdminId: string | null }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const admins = useQuery(assignableAdminsQuery()).data?.data;
  const stats = useQuery(ticketStatsQuery()).data?.data;

  // The same query string the page prefetched with; the table's own config
  // waits for the admin roster and the status counts its tabs show.
  const queryString = ticketsQueryString(searchParams);
  const query = useQuery({ ...ticketsListQuery(queryString), placeholderData: keepPreviousData });
  const searching = Boolean(searchParams.get("search"));
  const config = useMemo(() => buildTicketsTableConfig(admins ?? [], stats, currentAdminId, searching), [admins, stats, currentAdminId, searching]);
  const { dataTableProps } = useServerDataTable<ISupportTicket>(config);
  // A ticket opened from here comes back to this tab, these filters, this page.
  const listQuery = searchParams.toString();

  return (
    <DataTable
      {...dataTableProps}
      // An outage isn't "no tickets": the table says the queue didn't load,
      // with Try again, while its tabs, search and filters stay to change
      // back a filter the API refuses.
      {...toTableQueryProps(query)}
      errorTitle="Couldn't load tickets"
      errorDescription="Try again in a moment."
      data={query.data?.data}
      columns={ticketsColumns}
      // Each column keeps its px on a phone, so the number and the status
      // badge aren't crushed; the subject gives way, then the table scrolls.
      // The minimum (about 934px) still fits a 1280px laptop's card.
      layout={{ rowHeight: 58, flexMinWidth: 160 }}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(ticketHref(row.id, listQuery))}
      // A ticket nobody has opened gets the blue wash, an urgent one still
      // in the queue the red.
      rowClassName={(row) =>
        isNewTicket(row) ? "bg-info-50/60 hover:bg-info-50" : row.priority === "URGENT" && OPEN_TICKET_STATUSES.includes(row.status) ? "bg-expense-soft hover:bg-expense-soft" : undefined
      }
      // An empty default tab is good news, not a filter that missed.
      emptyMessage={hasTicketFilters(searchParams) ? "No tickets match these filters." : "Nothing open: every ticket has an answer."}
    />
  );
};

export default TicketsTable;
