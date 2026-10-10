import Link from "next/link";
import SectionCard from "@/components/shared/SectionCard";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/date";
import type { IDashboardLastBackup } from "@/types/dashboard.types";

const LastBackupCard = ({ backup }: { backup: IDashboardLastBackup }) => {
  return (
    <SectionCard
      title="Last Successful Backup"
      action={
        <Button asChild variant="link" size="sm" className="h-auto p-0">
          <Link href="/admin/system">View backups &rarr;</Link>
        </Button>
      }
    >
      <p className="text-lg font-semibold text-foreground">{formatDateTime(backup.completedAt, "Never")}</p>
      {backup.sizeMb !== null && <p className="mt-0.5 text-sm text-muted-foreground">{backup.sizeMb} MB</p>}
    </SectionCard>
  );
};

export default LastBackupCard;
