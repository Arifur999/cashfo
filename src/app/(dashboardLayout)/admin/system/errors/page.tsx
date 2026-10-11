import type { Metadata } from "next";
import ErrorLogsTable from "@/components/modules/Admin/System/ErrorLogs/ErrorLogsTable";
import { ERROR_LOGS_TABLE_CONFIG } from "@/components/modules/Admin/System/ErrorLogs/errorLogsTable.config";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { buildTableQueryString } from "@/lib/queryString";
import { errorLogsListQuery } from "@/queries/system.queries";

export const metadata: Metadata = { title: "Error Logs" };

const ErrorLogsPage = async ({ searchParams }: PageProps<"/admin/system/errors">) => {
  const queryString = buildTableQueryString(await searchParams, ERROR_LOGS_TABLE_CONFIG);

  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(errorLogsListQuery(queryString))}>
      <ErrorLogsTable />
    </QueryPrefetch>
  );
};

export default ErrorLogsPage;
