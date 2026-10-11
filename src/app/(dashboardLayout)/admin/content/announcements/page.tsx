import type { Metadata } from "next";
import AnnouncementsTable from "@/components/modules/Admin/Content/Announcements/AnnouncementsTable";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { announcementsQuery } from "@/queries/announcement.queries";
import { plansQuery } from "@/queries/plan.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Announcements" };

const AnnouncementsPage = async () => {
  const admin = await getUserInfo();

  return (
    // Plans name the audience of plan-targeted announcements.
    <QueryPrefetch prefetch={(client) => Promise.all([client.prefetchQuery(announcementsQuery()), client.prefetchQuery(plansQuery())])}>
      <AnnouncementsTable canManage={canManage(admin?.role, "content")} />
    </QueryPrefetch>
  );
};

export default AnnouncementsPage;
