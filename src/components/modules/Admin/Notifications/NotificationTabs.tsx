import TabsNav from "@/components/shared/TabsNav";

// The section's three tabs, as the AdminNotifTemplates board draws them.
const NotificationTabs = () => (
  <TabsNav
    label="Notifications"
    tabs={[
      { label: "Templates", href: "/admin/notifications", exact: true },
      { label: "Campaigns", href: "/admin/notifications/campaigns" },
      { label: "Send history", href: "/admin/notifications/history" },
    ]}
  />
);

export default NotificationTabs;
