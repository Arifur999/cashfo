"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import DataTable from "@/components/shared/table/DataTable";
import Button from "@/components/smartly/Button";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { adminAccountsQuery, auditLogsListQuery } from "@/queries/security.queries";
import type { IAuditLogEntry } from "@/types/auditLog.types";
import AuditEntryDrawer from "./AuditEntryDrawer";
import { buildAuditLogColumns } from "./auditLogColumns";
import { AUDIT_LOG_TABLE_BASE_CONFIG, buildAuditLogTableConfig } from "./auditLogTable.config";

// ?entry=<id> opens that entry in the drawer, so an entry can be linked to.
// The API never sees it: the list query only copies its own keys.
const ENTRY_PARAM = "entry";
// The filters besides When. With none of them set, an empty list is a quiet
// day, not a search that found nothing.
const NARROWING_KEYS = ["adminUserId", "action", "entityType", "sensitiveOnly"] as const;
// The windows shorter than a week: an empty one offers the last 7 days.
const SHORT_WINDOWS: readonly string[] = ["today", "24h"];

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
  const within = searchParams.get("within") ?? AUDIT_LOG_TABLE_BASE_CONFIG.defaults.within;
  const today = within === "today";
  const narrowed = NARROWING_KEYS.some((key) => searchParams.get(key));
  const onFilterChange = dataTableProps.filters?.onFilterChange;
  // Nothing in a short window: the week is one click away, beside "Clear
  // filters".
  const widen =
    SHORT_WINDOWS.includes(within) && onFilterChange ? (
      <Button variant="secondary" size="sm" onClick={() => onFilterChange("within", "7d")}>
        {translate("Show the last 7 days")}
      </Button>
    ) : undefined;

  return (
    <>
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        data={query.data?.data}
        columns={columns}
        // The density scale's regular row. Each column keeps its px, so on a
        // phone a name never runs into what they did: On gives way, then
        // the table scrolls sideways.
        layout={{ rowHeight: 56, flexMinWidth: 160 }}
        getRowId={(row) => row.id}
        onRowClick={(row) => openEntry(row.id)}
        rowClassName={(row) => (row.id === entryId ? "bg-mint-50 hover:bg-mint-50" : undefined)}
        pager={{
          previous: "Newer",
          next: "Older",
          summary: (total) =>
            today
              ? plural(translate, total, "{count} entry today · newest first", "{count} entries today · newest first", undefined, locale)
              : plural(translate, total, "{count} entry · newest first", "{count} entries · newest first", undefined, locale),
        }}
        // A failed read is no empty log: the table says so under its
        // toolbar, whose Reset is the way back from a filter the server
        // refuses.
        errorTitle="Couldn't load the audit log"
        emptyMessage={!narrowed && today ? "Nothing logged today yet." : "No audit entries match these filters."}
        emptyAction={widen}
      />
      {/* Outside the table, so a linked entry still opens while the list fails. */}
      <AuditEntryDrawer entryId={entryId} listEntry={openRow} onClose={closeEntry} />
    </>
  );
};

export default AuditLogTable;
