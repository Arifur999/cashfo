import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getAnnouncements } from "@/services/announcement.services";

export const announcementsQuery = () =>
  queryOptions({
    queryKey: queryKeys.announcements.list(),
    queryFn: () => getAnnouncements(),
  });
