import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getAdminHelp } from "@/services/help.services";

// Admin › Settings: the Help page's company card and video guides.
export const adminHelpQuery = () =>
  queryOptions({
    queryKey: queryKeys.help.all,
    queryFn: () => getAdminHelp(),
  });
