import SystemTabs from "@/components/modules/Admin/System/SystemTabs";
import PageHeader from "@/components/shared/PageHeader";

// Shared by the four system tabs. SUPER_ADMIN only -- proxy.ts turns other
// roles away before this renders.
const SystemLayout = ({ children }: LayoutProps<"/admin/system">) => {
  return (
    <div className="space-y-6">
      <PageHeader title="System" description="Backups, feature flags, error logs and API rate limits." />
      <SystemTabs />
      {children}
    </div>
  );
};

export default SystemLayout;
