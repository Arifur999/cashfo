import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getFeatureRequests } from "@/services/featureRequest.services";

export const featureRequestsQuery = () =>
  queryOptions({
    queryKey: queryKeys.featureRequests.list(),
    queryFn: () => getFeatureRequests(),
  });
