import TabsNav from "@/components/shared/TabsNav";

const SystemTabs = () => {
  return (
    <TabsNav
      label="System sections"
      tabs={[
        { label: "Backups", href: "/admin/system", exact: true },
        { label: "Feature Flags", href: "/admin/system/feature-flags" },
        { label: "Error Logs", href: "/admin/system/errors" },
        { label: "Rate Limits", href: "/admin/system/rate-limits" },
      ]}
    />
  );
};

export default SystemTabs;
