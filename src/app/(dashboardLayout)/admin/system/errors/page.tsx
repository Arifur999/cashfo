import ErrorsBoard from "@/components/modules/Admin/System/ErrorLogs/ErrorsBoard";
import { errorsQueryString } from "@/components/modules/Admin/System/ErrorLogs/errorsQuery";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { errorLogsListQuery } from "@/queries/system.queries";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Errors");

const ErrorsPage = () => {
  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(errorLogsListQuery(errorsQueryString()))}>
      <ErrorsBoard />
    </QueryPrefetch>
  );
};

export default ErrorsPage;
