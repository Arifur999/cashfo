import SecurityTabs from "@/components/modules/Admin/Security/SecurityTabs";
import PageHeader from "@/components/shared/PageHeader";

// Shared by the four tabbed sections. The whole area is SUPER_ADMIN only --
// proxy.ts turns other roles away before any of this renders.
const SecurityLayout = ({ children }: LayoutProps<"/admin/security">) => {
  return (
    <div className="space-y-6">
      <PageHeader title="Security & Audit" description="Audit trail, sign-in monitoring, suspicious activity and admin accounts." />
      <SecurityTabs />
      {children}
    </div>
  );
};

export default SecurityLayout;
