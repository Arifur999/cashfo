"use client";

import { usePathname } from "next/navigation";
import CreateAnnouncementButton from "./Announcements/CreateAnnouncementButton";
import CreateTranslationDialog from "./Translations/CreateTranslationDialog";

// The layout draws the header for every content tab: Announcements makes a
// banner from up there, and Translations its new string, so its toolbar
// stays the board's tabs, area and search.
const ContentHeaderAction = ({ canManage }: { canManage: boolean }) => {
  const pathname = usePathname();
  if (pathname === "/admin/content/announcements") {
    return canManage ? <CreateAnnouncementButton /> : null;
  }
  if (pathname === "/admin/content/translations") {
    return canManage ? <CreateTranslationDialog /> : null;
  }
  return null;
};

export default ContentHeaderAction;
