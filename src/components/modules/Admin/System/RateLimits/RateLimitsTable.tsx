"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { rateLimitLogsListQuery, rateLimitSummaryQuery } from "@/queries/system.queries";
import type { IRateLimitLog } from "@/types/system.types";
import { rateLimitsColumns } from "./rateLimitsColumns";
import { buildRateLimitsTableConfig, RATE_LIMITS_TABLE_BASE_CONFIG } from "./rateLimitsTable.config";

const RateLimitsTable = () => {
  const searchParams = useSearchParams();
  const { data: summaryResponse } = useQuery(rateLimitSummaryQuery());
  const topEndpoints = useMemo(() => summaryResponse?.data.topEndpoints ?? [], [summaryResponse]);
  const config = useMemo(() => buildRateLimitsTableConfig(topEndpoints), [topEndpoints]);

  const { queryString, dataTableProps } = useServerDataTable<IRateLimitLog>(config);
  const query = useQuery({ ...rateLimitLogsListQuery(queryString), placeholderData: keepPreviousData });
  const narrowed = RATE_LIMITS_TABLE_BASE_CONFIG.queryKeys.some((key) => searchParams.get(key));

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      data={query.data?.data}
      columns={rateLimitsColumns}
      getRowId={(row) => row.id}
      // A failed read is not an empty log: the table says so under its
      // toolbar, filters still to hand.
      errorTitle="Couldn't load the request windows"
      // Nothing writes this log yet (the note above says so), so an
      // unfiltered empty list isn't "nobody hit a limit".
      emptyMessage={narrowed ? "No request windows match these filters." : "Nothing recorded yet."}
    />
  );
};

export default RateLimitsTable;
