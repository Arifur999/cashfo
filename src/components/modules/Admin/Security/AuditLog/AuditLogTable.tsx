"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import DataTable from "@/components/shared/table/DataTable";
import Button from "@/components/smartly/Button";
import ErrorState from "@/components/smartly/ErrorState";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { adminAccountsQuery, auditLogsListQuery } from "@/queries/security.queries";
import type { IAuditLogEntry } from "@/types/auditLog.types";
import { hrefWithoutFilters } from "../knownWithin";
import AuditEntryDrawer from "./AuditEntryDrawer";
import { buildAuditLogColumns } from "./auditLogColumns";
import { AUDIT_LOG_TABLE_BASE_CONFIG, buildAuditLogTableConfig } from "./auditLogTable.config";

// ?entry=<id> opens that entry in the drawer, so an entry can be linked to.
// The API never sees it: the list query only copies its own keys.
const ENTRY_PARAM = "entry";
// The filters besides When. With none of them set, an empty list is a quiet
// day, not a search that found nothing.
const NARROWING_KEYS = ["adminUserId", "action", "entityType", "sensitiveOnly"] as const;

const AuditLogTable = () => {
  const { translate, locale } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const entryId = searchParams.get(ENTRY_PARAM);

  const { data: adminsResponse } = useQuery(adminAccountsQuery());
  const admins = useMemo(() => adminsResponse?.data ?? [], [adminsResponse]);
  const config = useMemo(() => buildAuditLogTableConfig(admins, translate, locale), [admins, translate, locale]);
  const { queryString, dataTableProps } = useServerDataTable<IAuditLogEntry>(config);
  const query = useQuery({ ...auditLogsListQuery(queryString), placeholderData: keepPreviousData });

  // Opening an entry adds one history step (the same history API the
  // table's own URL state uses, so filters and the entry sit side by side);
  // closing it goes back over that step, so Back never reopens a closed
  // entry. A linked ?entry= was never pushed here: closing replaces it away.
  const [pushedEntry, setPushedEntry] = useState(false);
  const openEntry = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(ENTRY_PARAM, id);
      window.history.pushState(null, "", `${pathname}?${params.toString()}`);
      setPushedEntry(true);
    },
    [pathname, searchParams],
  );
  const closeEntry = useCallback(() => {
    if (pushedEntry) {
      setPushedEntry(false);
      window.history.back();
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete(ENTRY_PARAM);
    const rest = params.toString();
    window.history.replaceState(null, "", rest ? `${pathname}?${rest}` : pathname);
  }, [pathname, pushedEntry, searchParams]);

  const columns = useMemo(() => buildAuditLogColumns((entry) => openEntry(entry.id)), [openEntry]);
  const openRow = query.data?.data.find((entry) => entry.id === entryId);
  // "11 entries today" while the list shows today, as it opens.
  const today = (searchParams.get("within") ?? AUDIT_LOG_TABLE_BASE_CONFIG.defaults.within) === "today";
  const narrowed = NARROWING_KEYS.some((key) => searchParams.get(key));
  const drawer = <AuditEntryDrawer entryId={entryId} listEntry={openRow} onClose={closeEntry} />;

  // A failed read is no empty log: say so, and offer it again. The toolbar
  // goes with the table, so while a filter is set (one the server may be
  // refusing) there is a way back to the plain log too.
  if (query.isError && !query.data) {
    const filtered = AUDIT_LOG_TABLE_BASE_CONFIG.queryKeys.some((key) => searchParams.has(key));
    return (
      <>
        <ErrorState
          title={translate("Couldn't load the audit log")}
          onRetry={() => void query.refetch()}
          secondaryAction={
            filtered && (
              <Button variant="secondary" onClick={() => window.history.replaceState(null, "", hrefWithoutFilters(pathname, new URLSearchParams(searchParams.toString()), AUDIT_LOG_TABLE_BASE_CONFIG.queryKeys))}>
                {translate("Clear filters")}
              </Button>
            )
          }
          className="shadow-card"
        />
        {drawer}
      </>
    );
  }

  return (
    <>
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        data={query.data?.data}
        columns={columns}
        // The density scale's regular row.
        layout={{ rowHeight: 56 }}
        getRowId={(row) => row.id}
        onRowClick={(row) => openEntry(row.id)}
        rowClassName={(row) => (row.id === entryId ? "bg-mint-50 hover:bg-mint-50" : undefined)}
        pager={{
          previous: "Newer",
          next: "Older",
          summary: (total) => {
            const count = formatCount(total, locale);
            if (today) return translate(total === 1 ? "{count} entry today · newest first" : "{count} entries today · newest first", { count });
            return translate(total === 1 ? "{count} entry · newest first" : "{count} entries · newest first", { count });
          },
        }}
        emptyMessage={!narrowed && today ? "Nothing logged today yet." : "No audit entries match these filters."}
      />
      {drawer}
    </>
  );
};

export default AuditLogTable;
