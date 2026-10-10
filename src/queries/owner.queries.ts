import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getOwners } from "@/services/owner.services";

export const ownersListQuery = (queryString: string) =>
  queryOptions({
    queryKey: queryKeys.owners.list(queryString),
    queryFn: () => getOwners(queryString),
  });
