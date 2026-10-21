"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import ErrorState from "@/components/smartly/ErrorState";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { rateLimitLogsListQuery, rateLimitSummaryQuery } from "@/queries/system.queries";
import type { IRateLimitLog } from "@/types/system.types";
import { rateLimitsColumns } from "./rateLimitsColumns";
import { buildRateLimitsTableConfig, RATE_LIMITS_TABLE_BASE_CONFIG } from "./rateLimitsTable.config";

const RateLimitsTable = () => {
  const { translate } = useLocale();
  const searchParams = useSearchParams();
  const { data: summaryResponse } = useQuery(rateLimitSummaryQuery());
  const topEndpoints = useMemo(() => summaryResponse?.data.topEndpoints ?? [], [summaryResponse]);
  const config = useMemo(() => buildRateLimitsTableConfig(topEndpoints), [topEndpoints]);

  const { queryString, dataTableProps } = useServerDataTable<IRateLimitLog>(config);
  const query = useQuery({ ...rateLimitLogsListQuery(queryString), placeholderData: keepPreviousData });
  const narrowed = RATE_LIMITS_TABLE_BASE_CONFIG.queryKeys.some((key) => searchParams.get(key));

  // A failed read is not an empty log.
  if (query.isError && !query.data) {
    return <ErrorState title={translate("Couldn't load the request windows")} onRetry={() => void query.refetch()} className="shadow-card" />;
  }

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      data={query.data?.data}
      columns={rateLimitsColumns}
      getRowId={(row) => row.id}
      // Nothing writes this log yet (the note above says so), so an
      // unfiltered empty list isn't "nobody hit a limit".
      emptyMessage={narrowed ? "No request windows match these filters." : "Nothing recorded yet."}
    />
  );
};

export default RateLimitsTable;
