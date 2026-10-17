"use client";

import { usePathname } from "next/navigation";
import CreateAnnouncementButton from "./Announcements/CreateAnnouncementButton";

// The layout draws the header for every content tab; only the
// Announcements tab has something to make from up there.
const ContentHeaderAction = ({ canManage }: { canManage: boolean }) => {
  const pathname = usePathname();
  if (!canManage || pathname !== "/admin/content/announcements") {
    return null;
  }
  return <CreateAnnouncementButton />;
};

export default ContentHeaderAction;
