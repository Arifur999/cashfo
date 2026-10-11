"use client";

import { useQuery } from "@tanstack/react-query";
import Callout from "@/components/shared/Callout";
import StatsGrid from "@/components/shared/StatsGrid";
import { formatDateTime } from "@/lib/date";
import { formatNumber, formatPercent } from "@/lib/number";
import { backupStatusSummaryQuery } from "@/queries/system.queries";

// More than this many days without a good backup is worth a warning.
const STALE_AFTER_DAYS = 2;

const BackupSummary = () => {
  const summary = useQuery(backupStatusSummaryQuery()).data?.data;
  const days = summary?.daysSinceLastBackup ?? null;
  const isStale = days === null || days > STALE_AFTER_DAYS;

  return (
    <div className="space-y-4">
      <StatsGrid
        columns={3}
        items={[
          { title: "Last Successful Backup", value: formatDateTime(summary?.lastSuccessfulBackupAt, "Never"), iconName: "Clock" },
          {
            title: "Days Since",
            value: formatNumber(days),
            iconName: "AlertTriangle",
            description: isStale ? `Over ${STALE_AFTER_DAYS} days -- check the backup job` : "Within the expected window",
          },
          { title: "Success Rate (30d)", value: formatPercent(summary?.successRate30d), iconName: "Server", description: "Finished runs only" },
        ]}
      />
      <Callout variant="warning">
        Backup automation isn&apos;t wired up yet: no database dump or storage upload runs anywhere, so this page only shows records written
        elsewhere.
      </Callout>
    </div>
  );
};

export default BackupSummary;
