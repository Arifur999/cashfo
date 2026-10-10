import SectionCard from "@/components/shared/SectionCard";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { formatDateTime } from "@/lib/date";
import type { IOwnerActivityLogEntry } from "@/types/owner.types";

const OwnerActivityTimeline = ({ entries }: { entries: IOwnerActivityLogEntry[] }) => {
  return (
    <SectionCard title="Activity Log" tooltip="Admin actions taken on this owner, newest first.">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity recorded for this owner yet.</p>
      ) : (
        <ol className="space-y-4 border-l pl-4">
          {entries.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary ring-4 ring-card" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">{auditActionLabel(entry.action)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(entry.createdAt)} by {entry.adminName}
              </p>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
};

export default OwnerActivityTimeline;
