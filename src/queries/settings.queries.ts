import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getPlatformSettings } from "@/services/settings.services";

// The platform settings, for pages that show one of them outside Settings
// (System's maintenance card).
export const platformSettingsQuery = () =>
  queryOptions({
    queryKey: queryKeys.settings.all,
    queryFn: () => getPlatformSettings(),
  });
