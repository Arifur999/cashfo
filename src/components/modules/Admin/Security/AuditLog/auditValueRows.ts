import { type AuditDiffRow, diffAuditValues } from "@/lib/auditDiff";
import { auditFieldLabel, QUIET_FIELDS } from "@/lib/auditRecords";

export interface AuditValueRow extends AuditDiffRow {
  // "max workspaces" for featureLimits.maxWorkspaces, as the On column says it.
  label: string;
  // Changed, added or removed.
  differs: boolean;
  // A timestamp or the sensitive mark: the bookkeeping the log's On column
  // leaves out too.
  quiet: boolean;
}

export interface AuditValueRows {
  all: AuditValueRow[];
  // What "What changed" leads with: a real field that moved, appeared or went.
  changed: AuditValueRow[];
  // How many rows fold away behind the toggle, and whether any of them moved
  // (an updatedAt), which decides what the toggle may call them.
  folded: number;
  foldedMoved: boolean;
}

export const auditValueRows = (oldValue: unknown, newValue: unknown): AuditValueRows => {
  const all = diffAuditValues(oldValue, newValue).map((row) => ({
    ...row,
    label: auditFieldLabel(row.field),
    differs: row.before !== row.after,
    quiet: QUIET_FIELDS.has(row.field.split(".").pop() ?? row.field),
  }));
  const changed = all.filter((row) => row.differs && !row.quiet);
  const folded = all.filter((row) => !changed.includes(row));
  return { all, changed, folded: folded.length, foldedMoved: folded.some((row) => row.differs) };
};
