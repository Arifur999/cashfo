"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { groupLoginAttempts, type LoginAttemptGroup } from "@/lib/loginAttempts";
import { formatNumber } from "@/lib/number";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { loginAttemptsListQuery, loginAttemptsSummaryQuery } from "@/queries/security.queries";
import { loginAttemptsColumns } from "./loginAttemptsColumns";
import { LOGIN_ATTEMPTS_TABLE_CONFIG } from "./loginAttemptsTable.config";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const GROUPING_NOTE = "Repeated tries from one network are shown as one row.";

// The API pages through single attempts; each page is folded into rows here,
// so a burst of failures reads as one line with its count.
const LoginAttemptsTable = () => {
  const { translate } = useLocale();
  const failedToday = useQuery(loginAttemptsSummaryQuery()).data?.data.failedLast24h;
  const { queryString, dataTableProps } = useServerDataTable<LoginAttemptGroup>(LOGIN_ATTEMPTS_TABLE_CONFIG);
  const query = useQuery({ ...loginAttemptsListQuery(queryString), placeholderData: keepPreviousData });
  const rows = useMemo(() => (query.data?.data ? groupLoginAttempts(query.data.data) : undefined), [query.data]);

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      data={rows}
      columns={loginAttemptsColumns}
      layout={{ rowHeight: 54 }}
      getRowId={(row) => row.id}
      rowClassName={(row) => (row.attempts.length > 1 ? "bg-expense-soft hover:bg-expense-soft" : undefined)}
      pager={{
        previous: "Newer",
        next: "Older",
        summary: () =>
          failedToday === undefined
            ? translate(GROUPING_NOTE)
            : `${translate("{count} failed in the last 24 hours.", { count: formatNumber(failedToday) })} ${translate(GROUPING_NOTE)}`,
      }}
      emptyMessage="No sign-in attempts match these filters."
    />
  );
};

export default LoginAttemptsTable;
