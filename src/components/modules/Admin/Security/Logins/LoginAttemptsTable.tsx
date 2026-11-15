"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { groupLoginAttempts } from "@/lib/loginAttempts";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { loginAttemptsListQuery } from "@/queries/security.queries";
import { loginAttemptsColumns } from "./loginAttemptsColumns";
import { type LoginAttemptRow, markPageEdges } from "./loginAttemptRows";
import { LOGIN_ATTEMPTS_TABLE_BASE_CONFIG, LOGIN_ATTEMPTS_TABLE_CONFIG } from "./loginAttemptsTable.config";

const GROUPING_NOTE = "Repeated tries from one network are shown as one row.";
// The filters besides When. With none of them set, an empty list is a quiet
// day, not a search that found nothing.
const NARROWING_KEYS = ["success", "email", "ipAddress"] as const;

// The API pages through single attempts; each page is folded into rows here,
// so a burst of failures reads as one line with its count.
const LoginAttemptsTable = () => {
  const { translate, locale } = useLocale();
  const searchParams = useSearchParams();
  const { queryString, dataTableProps } = useServerDataTable<LoginAttemptRow>(LOGIN_ATTEMPTS_TABLE_CONFIG);
  const query = useQuery({ ...loginAttemptsListQuery(queryString), placeholderData: keepPreviousData });
  const rows = useMemo(() => {
    if (!query.data?.data) return undefined;
    const meta = query.data.meta;
    return markPageEdges(groupLoginAttempts(query.data.data), { hasNewer: (meta?.page ?? 1) > 1, hasOlder: meta ? meta.page < meta.totalPage : false });
  }, [query.data]);
  const narrowed = NARROWING_KEYS.some((key) => searchParams.get(key));
  const lastDay = (searchParams.get("within") ?? LOGIN_ATTEMPTS_TABLE_BASE_CONFIG.defaults.within) === "24h";

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      data={rows}
      columns={loginAttemptsColumns}
      // The density scale's regular row.
      layout={{ rowHeight: 54, designWidth: 794 }}
      getRowId={(row) => row.id}
      rowClassName={(row) => (row.attempts.length > 1 ? "bg-expense-soft hover:bg-expense-soft" : undefined)}
      pager={{
        previous: "Newer",
        next: "Older",
        // How many tries match the filters (the last day's failures are the
        // card above), then how the rows are folded.
        summary: (total) => `${plural(translate, total, "{count} try · newest first", "{count} tries · newest first", undefined, locale)} · ${translate(GROUPING_NOTE)}`,
      }}
      // A failed read is no quiet day: the table says so under its toolbar,
      // whose Reset is the way back from a filter the server refuses.
      errorTitle="Couldn't load the sign-in attempts"
      emptyMessage={!narrowed && lastDay ? "No sign-in attempts in the last 24 hours." : "No sign-in attempts match these filters."}
    />
  );
};

export default LoginAttemptsTable;
