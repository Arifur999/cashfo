import ErrorsBoard from "@/components/modules/Admin/System/ErrorLogs/ErrorsBoard";
import { errorsQueryString, readErrorFilters } from "@/components/modules/Admin/System/ErrorLogs/errorsQuery";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { adminPageTitle } from "@/lib/i18n/locale";
import { errorLogsListQuery } from "@/queries/system.queries";

export const generateMetadata = adminPageTitle("Errors");

// The board keeps its chips in the address bar; the prefetch reads the same
// ones, so a linked or refreshed view arrives already loaded.
const ErrorsPage = async ({ searchParams }: PageProps<"/admin/system/errors">) => {
  const queryString = errorsQueryString(readErrorFilters(await searchParams));

  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(errorLogsListQuery(queryString))}>
      <ErrorsBoard />
    </QueryPrefetch>
  );
};

export default ErrorsPage;
