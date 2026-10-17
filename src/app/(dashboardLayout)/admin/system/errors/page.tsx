import type { Metadata } from "next";
import ErrorsBoard from "@/components/modules/Admin/System/ErrorLogs/ErrorsBoard";
import { errorsQueryString } from "@/components/modules/Admin/System/ErrorLogs/errorsQuery";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { errorLogsListQuery } from "@/queries/system.queries";

export const metadata: Metadata = { title: "Errors" };

const ErrorsPage = () => {
  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(errorLogsListQuery(errorsQueryString()))}>
      <ErrorsBoard />
    </QueryPrefetch>
  );
};

export default ErrorsPage;
