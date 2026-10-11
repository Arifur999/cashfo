import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getAccountTemplates } from "@/services/accountTemplate.services";

export const accountTemplatesQuery = () =>
  queryOptions({
    queryKey: queryKeys.accountTemplates.list(),
    queryFn: () => getAccountTemplates(),
  });
