"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import ErrorState from "@/components/smartly/ErrorState";
import { Button } from "@/components/ui/button";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { buildTableQueryString } from "@/lib/queryString";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { OPEN_TICKET_STATUSES } from "@/lib/tickets";
import { assignableAdminsQuery, ticketsListQuery, ticketStatsQuery } from "@/queries/ticket.queries";
import type { ISupportTicket } from "@/types/ticket.types";
import { hasTicketFilters, TICKETS_ROUTE, ticketHref } from "../ticketLinks";
import { ticketsColumns } from "./ticketsColumns";
import { buildTicketsTableConfig, TICKETS_TABLE_BASE_CONFIG } from "./ticketsTable.config";

// The queue. currentAdminId puts the reader first in the Assigned filter.
const TicketsTable = ({ currentAdminId }: { currentAdminId: string | null }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const admins = useQuery(assignableAdminsQuery()).data?.data;
  const statusCounts = useQuery(ticketStatsQuery()).data?.data.statusCounts;

  // The same query string the page prefetched with; the table's own config
  // waits for the admin roster and the status counts its tabs show.
  const queryString = buildTableQueryString(searchParams, TICKETS_TABLE_BASE_CONFIG);
  const query = useQuery({ ...ticketsListQuery(queryString), placeholderData: keepPreviousData });
  const config = useMemo(() => buildTicketsTableConfig(admins ?? [], statusCounts, currentAdminId), [admins, statusCounts, currentAdminId]);
  const { dataTableProps } = useServerDataTable<ISupportTicket>(config);
  // A ticket opened from here comes back to this tab, these filters, this page.
  const listQuery = searchParams.toString();

  // An outage isn't "no tickets": say the queue didn't load, and offer to
  // try again, or to drop a filter the API refuses (an old ?priority=).
  if (query.isError && !query.data) {
    return (
      <ErrorState
        title={t("Couldn't load tickets")}
        description={t("Try again in a moment.")}
        onRetry={() => void query.refetch()}
        secondaryAction={
          hasTicketFilters(searchParams) ? (
            <Button asChild variant="secondary">
              <Link href={TICKETS_ROUTE}>{t("Clear filters")}</Link>
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
      columns={ticketsColumns}
      layout={{ rowHeight: 58 }}
      // The tabs and the search on top, who has it, how urgent and its type under them.
      toolbarRows={2}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(ticketHref(row.id, listQuery))}
      // An urgent ticket still in the queue gets the red wash.
      rowClassName={(row) => (row.priority === "URGENT" && OPEN_TICKET_STATUSES.includes(row.status) ? "bg-expense-soft hover:bg-expense-soft" : undefined)}
      // An empty default tab is good news, not a filter that missed.
      emptyMessage={hasTicketFilters(searchParams) ? "No tickets match these filters." : "Nothing open: every ticket has an answer."}
    />
  );
};

export default TicketsTable;
