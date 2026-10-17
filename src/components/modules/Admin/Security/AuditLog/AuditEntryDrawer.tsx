"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import CopyButton from "@/components/shared/CopyButton";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import { Button } from "@/components/ui/button";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { auditRecordHref, auditRecordName, auditRecordTypeLabel, namesNoRecord } from "@/lib/auditRecords";
import { ADMIN_ROLE_LABELS } from "@/lib/adminRoles";
import { formatRelativeDateTime } from "@/lib/date";
import { auditLogDetailQuery } from "@/queries/security.queries";
import type { IAuditLogEntry } from "@/types/auditLog.types";
import AuditValueDiff from "./AuditValueDiff";


interface AuditEntryDrawerProps {
  entryId: string | null;
  // The row from the list, shown at once while the entry itself loads.
  listEntry?: IAuditLogEntry;
  onClose: () => void;
}

// One audit entry, as the design draws it over the log: who, on what, from
// where, the fields that changed (before struck out, after in green), and
// the whole saved record to copy.
const AuditEntryDrawer = ({ entryId, listEntry, onClose }: AuditEntryDrawerProps) => {
  const detail = useQuery({ ...auditLogDetailQuery(entryId ?? ""), enabled: Boolean(entryId) });
  const entry = detail.data?.data ?? listEntry;

  return (
    <FormDrawer
      open={Boolean(entryId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      width="lg"
      closeOnOutsideClick
      title={entry ? auditActionLabel(entry.action) : detail.isError ? "Entry not found" : "Loading entry..."}
      description={
        entry ? (
          <>
            {formatRelativeDateTime(entry.createdAt, undefined, "—", true)} · <code className="font-mono text-caption">{entry.action}</code>
          </>
        ) : undefined
      }
    >
      {entry ? <EntryBody entry={entry} /> : <p className="text-small text-ink-muted">{detail.isFetching ? "Loading..." : "This entry may have been removed, or the link is wrong."}</p>}
    </FormDrawer>
  );
};

const EntryBody = ({ entry }: { entry: IAuditLogEntry }) => {
  const recordName = auditRecordName(entry);
  const href = auditRecordHref(entry);
  const saved = JSON.stringify(
    {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      ipAddress: entry.ipAddress,
      createdAt: entry.createdAt,
    },
    null,
    2,
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-4 gap-y-3 text-body">
        <dt className="text-ink-muted">Admin</dt>
        <dd className="font-semibold text-ink">
          {entry.adminUser.name} · {ADMIN_ROLE_LABELS[entry.adminUser.role]}
        </dd>
        {!namesNoRecord(entry.action) && (
          <>
            <dt className="text-ink-muted">Changed</dt>
            <dd className="font-semibold text-ink">
              {auditRecordTypeLabel(entry.entityType)}
              {recordName !== auditRecordTypeLabel(entry.entityType) && ` · ${recordName}`}
            </dd>
          </>
        )}
        <dt className="text-ink-muted">IP address</dt>
        <dd>
          <code className="font-mono text-ink">{entry.ipAddress ?? "—"}</code>
        </dd>
      </dl>

      <section aria-labelledby="audit-changed" className="flex flex-col gap-2">
        <h3 id="audit-changed" className="text-body font-semibold text-ink">
          What changed
        </h3>
        <AuditValueDiff oldValue={entry.oldValue} newValue={entry.newValue} />
      </section>

      <section aria-labelledby="audit-saved" className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between gap-2">
          <h3 id="audit-saved" className="text-body font-semibold text-ink">
            Saved record
          </h3>
          <span className="text-caption text-ink-muted">The whole entry, as it was saved</span>
        </span>
        <pre className="max-h-64 overflow-auto rounded-md bg-ink px-4 py-3 font-mono text-caption leading-relaxed whitespace-pre-wrap text-line-strong">{saved}</pre>
      </section>

      <div className="-mx-6 mt-auto -mb-5 flex flex-wrap justify-end gap-3 border-t border-line bg-cream px-6 py-4">
        <CopyButton value={saved} label="the entry as JSON" text="Copy as JSON" size="md" />
        {href && (
          <Button asChild>
            <Link href={href}>Open {recordName}</Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default AuditEntryDrawer;
