import Link from "next/link";
import SectionCard from "@/components/shared/SectionCard";
import { Button } from "@/components/ui/button";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { formatDateTime } from "@/lib/date";
import type { IDashboardAuditLog } from "@/types/dashboard.types";

const RecentActivityCard = ({ logs }: { logs: IDashboardAuditLog[] }) => {
  return (
    <SectionCard
      title="Recent Activity"
      action={
        <Button asChild variant="link" size="sm" className="h-auto p-0">
          <Link href="/admin/security">View audit log &rarr;</Link>
        </Button>
      }
    >
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity.</p>
      ) : (
        <ol className="space-y-3">
          {logs.map((log) => (
            <li key={log.id} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-foreground">{auditActionLabel(log.action)}</p>
                <p className="text-xs text-muted-foreground">
                  {log.adminName} &middot; {formatDateTime(log.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
};

export default RecentActivityCard;
