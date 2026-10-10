import type { Metadata } from "next";
import DashboardStats from "@/components/modules/Admin/Dashboard/DashboardStats";
import LastBackupCard from "@/components/modules/Admin/Dashboard/LastBackupCard";
import RecentActivityCard from "@/components/modules/Admin/Dashboard/RecentActivityCard";
import PageHeader from "@/components/shared/PageHeader";
import { getUserInfo } from "@/services/auth.services";
import { getDashboardSummary } from "@/services/dashboard.services";

export const metadata: Metadata = { title: "Dashboard" };

const DashboardPage = async () => {
  // getUserInfo is request-cached: the layout already fetched (and required) it.
  const [admin, { data: summary }] = await Promise.all([getUserInfo(), getDashboardSummary()]);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${admin?.name ?? "Admin"}`} description="Here's what's happening across the platform." />
      <DashboardStats summary={summary} />
      {(summary.lastBackup || summary.recentAuditLogs) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {summary.lastBackup && <LastBackupCard backup={summary.lastBackup} />}
          {summary.recentAuditLogs && <RecentActivityCard logs={summary.recentAuditLogs} />}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
