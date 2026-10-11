import TabsNav from "@/components/shared/TabsNav";

const NotificationTabs = () => {
  return (
    <TabsNav
      label="Notification sections"
      tabs={[
        { label: "Templates", href: "/admin/notifications", exact: true },
        { label: "Send History", href: "/admin/notifications/history" },
        { label: "Campaigns", href: "/admin/notifications/campaigns" },
      ]}
    />
  );
};

export default NotificationTabs;
