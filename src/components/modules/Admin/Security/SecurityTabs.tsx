import TabsNav from "@/components/shared/TabsNav";

const SecurityTabs = () => {
  return (
    <TabsNav
      label="Security sections"
      tabs={[
        { label: "Audit Log", href: "/admin/security", exact: true },
        { label: "Login Monitoring", href: "/admin/security/logins" },
        { label: "Suspicious Activity", href: "/admin/security/flags" },
        { label: "Admin Accounts", href: "/admin/security/admins" },
      ]}
    />
  );
};

export default SecurityTabs;
