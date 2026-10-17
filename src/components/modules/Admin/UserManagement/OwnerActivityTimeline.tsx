import { auditActionLabel } from "@/lib/auditActionLabels";
import { formatRelativeDay } from "@/lib/date";
import type { IOwnerActivityLogEntry } from "@/types/owner.types";

// What admins did on this account, newest first: who, what, when.
const OwnerActivityTimeline = ({ entries }: { entries: IOwnerActivityLogEntry[] }) => {
  return (
    <section aria-labelledby="owner-history" className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-5 py-4 shadow-card">
      <h2 id="owner-history" className="text-title text-ink">
        What admins did on this account
      </h2>
      {entries.length === 0 ? (
        <p className="text-small text-ink-muted">Nothing yet.</p>
      ) : (
        <ol className="flex flex-col">
          {entries.map((entry) => (
            <li key={entry.id} className="flex gap-3 border-b border-surface-sunken py-2 text-body last:border-b-0">
              <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-emerald" />
              <span className="flex-1 leading-snug text-ink">
                <b className="font-semibold">{entry.adminName}</b> <span className="text-ink-2">{auditActionLabel(entry.action).toLowerCase()}</span>
              </span>
              <span className="shrink-0 text-small text-ink-muted">{formatRelativeDay(entry.createdAt)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default OwnerActivityTimeline;
