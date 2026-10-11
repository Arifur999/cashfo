import TabsNav from "@/components/shared/TabsNav";

// Tickets and feature requests are one "Support" section in the sidebar.
const SupportTabs = () => {
  return (
    <TabsNav
      label="Support views"
      tabs={[
        { label: "Tickets", href: "/admin/support" },
        { label: "Feature Requests", href: "/admin/feature-requests" },
      ]}
    />
  );
};

export default SupportTabs;
