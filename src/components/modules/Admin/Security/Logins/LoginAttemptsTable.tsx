"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { loginAttemptsListQuery, loginAttemptsSummaryQuery } from "@/queries/security.queries";
import type { ILoginAttempt } from "@/types/loginAttempt.types";
import { LOGIN_ATTEMPTS_HIDDEN_COLUMNS, loginAttemptsColumns } from "./loginAttemptsColumns";
import { buildLoginAttemptsTableConfig } from "./loginAttemptsTable.config";

const LoginAttemptsTable = () => {
  const { data: summaryResponse } = useQuery(loginAttemptsSummaryQuery());
  const topIps = useMemo(() => summaryResponse?.data.topIps ?? [], [summaryResponse]);
  const config = useMemo(() => buildLoginAttemptsTableConfig(topIps), [topIps]);

  const { queryString, dataTableProps } = useServerDataTable<ILoginAttempt>(config);
  const query = useQuery({ ...loginAttemptsListQuery(queryString), placeholderData: keepPreviousData });

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      data={query.data?.data}
      columns={loginAttemptsColumns}
      getRowId={(row) => row.id}
      tableId="login-attempts"
      defaultHiddenColumns={LOGIN_ATTEMPTS_HIDDEN_COLUMNS}
      exportFileName="login-attempts"
      emptyMessage="No sign-in attempts match these filters."
    />
  );
};

export default LoginAttemptsTable;
