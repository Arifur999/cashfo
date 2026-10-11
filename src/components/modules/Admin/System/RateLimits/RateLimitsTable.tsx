"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { rateLimitLogsListQuery, rateLimitSummaryQuery } from "@/queries/system.queries";
import type { IRateLimitLog } from "@/types/system.types";
import { rateLimitsColumns } from "./rateLimitsColumns";
import { buildRateLimitsTableConfig } from "./rateLimitsTable.config";

const RateLimitsTable = () => {
  const { data: summaryResponse } = useQuery(rateLimitSummaryQuery());
  const topEndpoints = useMemo(() => summaryResponse?.data.topEndpoints ?? [], [summaryResponse]);
  const config = useMemo(() => buildRateLimitsTableConfig(topEndpoints), [topEndpoints]);

  const { queryString, dataTableProps } = useServerDataTable<IRateLimitLog>(config);
  const query = useQuery({ ...rateLimitLogsListQuery(queryString), placeholderData: keepPreviousData });

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      data={query.data?.data}
      columns={rateLimitsColumns}
      getRowId={(row) => row.id}
      tableId="rate-limits"
      exportFileName="rate-limits"
      emptyMessage="No request windows match these filters."
    />
  );
};

export default RateLimitsTable;
