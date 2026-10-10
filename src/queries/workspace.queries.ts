import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getWorkspaceOverview } from "@/services/workspace.services";

// Shared by the page's server prefetch and the client table's useQuery, so
// the two can never disagree on the key (which would waste the prefetch).
export const workspaceOverviewQuery = (queryString: string) =>
  queryOptions({
    queryKey: queryKeys.workspaces.list(queryString),
    queryFn: () => getWorkspaceOverview(queryString),
  });
