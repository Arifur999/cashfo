"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, ShieldOff, UserCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { buildTableQueryString } from "@/lib/queryString";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { ownersListQuery } from "@/queries/owner.queries";
import { plansQuery } from "@/queries/plan.queries";
import type { IOwnerOverviewItem, OwnerDialog } from "@/types/owner.types";
import OwnerDialogs from "./OwnerDialogs";
import { USERS_HIDDEN_COLUMNS, usersColumns } from "./usersColumns";
import { buildUsersTableConfig, USERS_TABLE_BASE_CONFIG } from "./usersTable.config";

const detailHref = (row: IOwnerOverviewItem) => `/admin/users/${row.userId}`;

// Each action only for the roles the API allows it (MANAGE_ROLES) -- the
// others got a 403 after clicking.
const UsersTable = ({ canChangeStatus, canChangePlan }: { canChangeStatus: boolean; canChangePlan: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: plansResponse } = useQuery(plansQuery());
  const plans = useMemo(() => plansResponse?.data ?? [], [plansResponse]);

  // The same query string the page prefetched with; the table's own config
  // waits for the plans and this page's status counts, which its tabs show.
  const queryString = buildTableQueryString(searchParams, USERS_TABLE_BASE_CONFIG);
  const query = useQuery({ ...ownersListQuery(queryString), placeholderData: keepPreviousData });
  const statusCounts = query.data?.data.statusCounts;
  const config = useMemo(() => buildUsersTableConfig(plans, statusCounts), [plans, statusCounts]);
  const { dataTableProps } = useServerDataTable<IOwnerOverviewItem>(config);
  const { activeDialog, activeRow, openDialog, closeDialog } = useRowDialogs<IOwnerOverviewItem, OwnerDialog>();

  const actions = useMemo<DataTableActions<IOwnerOverviewItem>>(
    () => ({
      onView: (row) => router.push(detailHref(row)),
      extra: [
        { label: "Change plan", icon: ArrowLeftRight, onClick: (row) => openDialog("changePlan", row), hidden: () => !canChangePlan },
        { label: "Activate", icon: UserCheck, onClick: (row) => openDialog("activate", row), hidden: (row) => !canChangeStatus || row.status !== "SUSPENDED" },
        {
          label: "Suspend",
          icon: ShieldOff,
          destructive: true,
          onClick: (row) => openDialog("suspend", row),
          hidden: (row) => !canChangeStatus || row.status !== "ACTIVE",
        },
      ],
    }),
    [router, openDialog, canChangePlan, canChangeStatus],
  );

  return (
    <>
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        data={query.data?.data.items}
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
