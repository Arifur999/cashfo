"use client";

import { usePathname } from "next/navigation";
import CreateCampaignButton from "./Campaigns/CreateCampaignButton";

// The layout draws the header for every notifications tab; only the
// Campaigns tab has something to make from up there.
const NotificationsHeaderAction = () => {
  const pathname = usePathname();
  if (pathname !== "/admin/notifications/campaigns") {
    return null;
  }
  return <CreateCampaignButton />;
};

export default NotificationsHeaderAction;
