import type { Metadata } from "next";
import BackupsCard from "@/components/modules/Admin/System/Backups/BackupsCard";
import HealthCards from "@/components/modules/Admin/System/Health/HealthCards";
import MaintenanceCard from "@/components/modules/Admin/System/Health/MaintenanceCard";
import RateLimitsCard from "@/components/modules/Admin/System/Health/RateLimitsCard";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { adminAccountsQuery } from "@/queries/security.queries";
import { platformSettingsQuery } from "@/queries/settings.queries";
import { backupsQuery, backupStatusSummaryQuery, healthQuery, rateLimitSummaryQuery } from "@/queries/system.queries";

export const metadata: Metadata = { title: "Health and backups" };

const HealthAndBackupsPage = () => {
  return (
    // The admin roster names whoever ran a manual backup.
    <QueryPrefetch
      prefetch={(client) =>
        Promise.all([
          client.prefetchQuery(healthQuery()),
          client.prefetchQuery(backupStatusSummaryQuery()),
          client.prefetchQuery(backupsQuery()),
          client.prefetchQuery(platformSettingsQuery()),
          client.prefetchQuery(rateLimitSummaryQuery()),
          client.prefetchQuery(adminAccountsQuery()),
        ])
      }
    >
      <div className="space-y-4">
        <HealthCards />
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
          <BackupsCard />
          <div className="flex flex-col gap-4">
            <MaintenanceCard />
            <RateLimitsCard />
          </div>
        </div>
      </div>
    </QueryPrefetch>
  );
};

export default HealthAndBackupsPage;
