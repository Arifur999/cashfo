"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, ShieldOff, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { ownersListQuery } from "@/queries/owner.queries";
import { plansQuery } from "@/queries/plan.queries";
import type { IOwnerOverviewItem, OwnerDialog } from "@/types/owner.types";
import OwnerDialogs from "./OwnerDialogs";
import { USERS_HIDDEN_COLUMNS, usersColumns } from "./usersColumns";
import { buildUsersTableConfig } from "./usersTable.config";

const detailHref = (row: IOwnerOverviewItem) => `/admin/users/${row.userId}`;

const UsersTable = () => {
  const router = useRouter();
  const { data: plansResponse } = useQuery(plansQuery());
  const plans = useMemo(() => plansResponse?.data ?? [], [plansResponse]);
  const config = useMemo(() => buildUsersTableConfig(plans), [plans]);

  const { queryString, dataTableProps } = useServerDataTable<IOwnerOverviewItem>(config);
  const query = useQuery({ ...ownersListQuery(queryString), placeholderData: keepPreviousData });
  const { activeDialog, activeRow, openDialog, closeDialog } = useRowDialogs<IOwnerOverviewItem, OwnerDialog>();

  const actions = useMemo<DataTableActions<IOwnerOverviewItem>>(
    () => ({
      onView: (row) => router.push(detailHref(row)),
      extra: [
        { label: "Change plan", icon: ArrowLeftRight, onClick: (row) => openDialog("changePlan", row) },
        { label: "Activate", icon: UserCheck, onClick: (row) => openDialog("activate", row), hidden: (row) => row.status !== "SUSPENDED" },
        {
          label: "Suspend",
          icon: ShieldOff,
          destructive: true,
          onClick: (row) => openDialog("suspend", row),
          hidden: (row) => row.status !== "ACTIVE",
        },
      ],
    }),
    [router, openDialog],
  );

  return (
    <>
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        data={query.data?.data}
        columns={usersColumns}
        getRowId={(row) => row.userId}
        tableId="users"
        defaultHiddenColumns={USERS_HIDDEN_COLUMNS}
        exportFileName="users"
        enableRowSelection
        actions={actions}
        onRowClick={(row) => router.push(detailHref(row))}
        emptyMessage="No users match these filters."
      />
      <OwnerDialogs owner={activeRow} activeDialog={activeDialog} onClose={closeDialog} plans={plans} />
    </>
  );
};

export default UsersTable;
