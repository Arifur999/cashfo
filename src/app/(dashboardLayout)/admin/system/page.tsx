import type { Metadata } from "next";
import BackupsTable from "@/components/modules/Admin/System/Backups/BackupsTable";
import BackupSummary from "@/components/modules/Admin/System/Backups/BackupSummary";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { backupStatusSummaryQuery, backupsQuery } from "@/queries/system.queries";

export const metadata: Metadata = { title: "Backups" };

const BackupsPage = () => {
  return (
    <QueryPrefetch prefetch={(client) => Promise.all([client.prefetchQuery(backupStatusSummaryQuery()), client.prefetchQuery(backupsQuery())])}>
      <BackupSummary />
      <BackupsTable />
    </QueryPrefetch>
  );
};

export default BackupsPage;
