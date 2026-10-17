"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { pluralize } from "@/lib/text";
import { adminAccountsQuery, auditLogsListQuery } from "@/queries/security.queries";
import type { IAuditLogEntry } from "@/types/auditLog.types";
import AuditEntryDrawer from "./AuditEntryDrawer";
import { buildAuditLogColumns } from "./auditLogColumns";
import { buildAuditLogTableConfig } from "./auditLogTable.config";

// ?entry=<id> opens that entry in the drawer, so an entry can be linked to.
// The API never sees it: the list query only copies its own keys.
const ENTRY_PARAM = "entry";

const AuditLogTable = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const entryId = searchParams.get(ENTRY_PARAM);

  const { data: adminsResponse } = useQuery(adminAccountsQuery());
  const admins = useMemo(() => adminsResponse?.data ?? [], [adminsResponse]);
  const config = useMemo(() => buildAuditLogTableConfig(admins), [admins]);
  const { queryString, dataTableProps } = useServerDataTable<IAuditLogEntry>(config);
  const query = useQuery({ ...auditLogsListQuery(queryString), placeholderData: keepPreviousData });

  // Same history API the table's own URL state uses, so filters and the
  // open entry live side by side in the address bar.
  const setEntry = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set(ENTRY_PARAM, id);
      else params.delete(ENTRY_PARAM);
      const query = params.toString();
      window.history.pushState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams],
  );
  const columns = useMemo(() => buildAuditLogColumns((entry) => setEntry(entry.id)), [setEntry]);
  const openRow = query.data?.data.find((entry) => entry.id === entryId);

  return (
    <>
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        data={query.data?.data}
        columns={columns}
        getRowId={(row) => row.id}
        tableId="audit-log"
        exportFileName="audit-log"
        onRowClick={(row) => setEntry(row.id)}
        rowClassName={(row) => (row.id === entryId ? "bg-mint-50 hover:bg-mint-50" : undefined)}
        pager={{ previous: "Newer", next: "Older", summary: (total) => `${pluralize(total, "entry", "entries")} · newest first` }}
        emptyMessage="No audit entries match these filters."
      />
      <AuditEntryDrawer entryId={entryId} listEntry={openRow} onClose={() => setEntry(null)} />
    </>
  );
};

export default AuditLogTable;
