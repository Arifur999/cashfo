"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { lookupAuditEntryAction } from "@/app/(dashboardLayout)/admin/security/(sections)/_action";
import CopyButton from "@/components/shared/CopyButton";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import { adminCrumb } from "@/lib/adminBreadcrumb";
import { ADMIN_ROLE_LABELS } from "@/lib/adminRoles";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { auditRecordHref, auditRecordName, auditRecordTypeLabel, namesNoRecord } from "@/lib/auditRecords";
import { formatRelativeDateTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ADMIN_USERS_ROUTE } from "@/lib/navItem";
import { queryKeys } from "@/lib/queryKeys";
import type { IAuditLogEntry } from "@/types/auditLog.types";
import AuditValueDiff from "./AuditValueDiff";

// One entry by its id: the entry, or null when there is none. An API that
// didn't answer throws, so the query retries before the drawer says so.
const auditEntryQuery = (id: string) =>
  queryOptions({
    queryKey: [...queryKeys.auditLogs.detail(id), "lookup"] as const,
    queryFn: async () => {
      const result = await lookupAuditEntryAction(id);
      if (result.status === "failed") throw new Error("The audit entry didn't load");
      return result.status === "found" ? result.entry : null;
    },
  });

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
  const { translate, locale } = useLocale();
  const detail = useQuery({ ...auditEntryQuery(entryId ?? ""), enabled: Boolean(entryId) });
  const entry = detail.data ?? listEntry;
  // Only the API's own "no such entry" reads as a wrong link; anything else
  // that went wrong can be tried again.
  const missing = detail.data === null && !entry;
  const failed = detail.isError && !entry;

  return (
    <FormDrawer
      centered
      open={Boolean(entryId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      width="lg"
      closeOnOutsideClick
      title={entry ? auditActionLabel(entry.action) : missing ? "Entry not found" : failed ? "Couldn't load this entry" : "Loading entry..."}
      description={
        entry ? (
          <>
            {formatRelativeDateTime(entry.createdAt, { withSeconds: true, t: translate, locale })} · <code className="font-mono text-caption">{entry.action}</code>
          </>
        ) : undefined
      }
    >
      {entry ? (
        <EntryBody entry={entry} />
      ) : failed ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-small text-ink-muted">
            <T>Check your internet and try again. Nothing was lost.</T>
          </p>
          <Button variant="secondary" size="sm" disabled={detail.isFetching} onClick={() => void detail.refetch()}>
            <RefreshCw aria-hidden="true" />
            <T>Try again</T>
          </Button>
        </div>
      ) : (
        <p className="text-small text-ink-muted">
          <T>{missing ? "This entry may have been removed, or the link is wrong." : "Loading..."}</T>
        </p>
      )}
    </FormDrawer>
  );
};

const EntryBody = ({ entry }: { entry: IAuditLogEntry }) => {
  const { translate } = useLocale();
  const recordName = auditRecordName(entry, translate);
  const typeLabel = auditRecordTypeLabel(entry.entityType, translate);
  const href = auditRecordHref(entry);
  // The button names where it leads. A record with a page of its own is
  // opened ("Open Yearly Pro"); an entry on someone else's record that leads
  // to a person (a workspace's owner) says so; the rest live in a list, and
  // the button names that list ("Go to Workspaces"), so it never promises the
  // record itself.
  const ownPage = Boolean(href && entry.entityId && href.endsWith(`/${entry.entityId}`));
  const toOwnerPage = Boolean(href && !ownPage && entry.entityType !== "User" && href.startsWith(`${ADMIN_USERS_ROUTE}/`));
  const toOwnerSearch = Boolean(href && entry.entityType !== "User" && href.startsWith(`${ADMIN_USERS_ROUTE}?`));
  const listName = href && !ownPage ? adminCrumb(href)?.page : null;
  const linkLabel = ownPage
    ? translate("Open {name}", { name: recordName })
    : toOwnerPage
      ? translate("Open the owner's page")
      : toOwnerSearch
        ? translate("Find the owner in Users")
        : listName
          ? translate("Go to {page}", { page: translate(listName) })
          : translate("Open");
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
    <div className="flex flex-1 flex-col gap-4.5">
      <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3.5 gap-y-2.5 text-[13.5px] leading-4">
        <dt className="text-ink-muted">
          <T>Admin</T>
        </dt>
        <dd className="font-semibold text-ink">
          {entry.adminUser.name} · <T>{ADMIN_ROLE_LABELS[entry.adminUser.role]}</T>
        </dd>
        {!namesNoRecord(entry.action) && (
          <>
            {/* What the entry changed: the record's kind and its name. */}
            <dt className="text-ink-muted">
              <T>Changed</T>
            </dt>
            <dd className="font-semibold text-ink">
              {typeLabel}
              {recordName !== typeLabel && ` · ${recordName}`}
            </dd>
          </>
        )}
        <dt className="text-ink-muted">
          <T>IP address</T>
        </dt>
        <dd>
          <code className="font-mono wrap-anywhere text-ink">{entry.ipAddress ?? "—"}</code>
        </dd>
      </dl>

      <section aria-labelledby="audit-changed" className="flex flex-col gap-2">
        <h3 id="audit-changed" className="text-[13.5px] font-semibold text-ink">
          <T>What changed</T>
        </h3>
        <AuditValueDiff oldValue={entry.oldValue} newValue={entry.newValue} action={entry.action} />
      </section>

      <section aria-labelledby="audit-saved" className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between gap-2">
          <h3 id="audit-saved" className="text-[13.5px] font-semibold text-ink">
            <T>Saved record</T>
          </h3>
          <span className="text-caption text-ink-muted">
            <T>The whole entry, as it was saved</T>
          </span>
        </span>
        <pre className="max-h-64 overflow-auto rounded-field bg-ink px-3.5 py-3 font-mono text-caption leading-[1.6] whitespace-pre-wrap text-line">{saved}</pre>
      </section>

      <div className="sticky bottom-0 -mx-6 mt-auto -mb-4.5 flex flex-wrap justify-end gap-2.5 border-t border-line bg-strip px-6 py-3.5">
        <CopyButton value={saved} label="the entry as JSON" text="Copy as JSON" size="md" />
        {href && (
          <Button asChild size="md">
            <Link href={href}>{linkLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default AuditEntryDrawer;
