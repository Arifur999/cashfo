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
import { getOwners } from "@/services/owner.services";
import type { IOwnerOverviewItem, OwnerDialog } from "@/types/owner.types";
import OwnerDialogs from "./OwnerDialogs";
import { usePersonHref } from "./usePersonHref";
import { usersColumns } from "./usersColumns";
import { buildUsersTableConfig, USERS_TABLE_BASE_CONFIG } from "./usersTable.config";

// Export reads every user that matches, a page at a time, with the list's
// own fetch.
const fetchUsersPage = async (queryString: string) => {
  const { data, meta } = await getOwners(queryString);
  return { rows: data.items, meta };
};

// Each action only for the roles the API allows it (MANAGE_ROLES) -- the
// others got a 403 after clicking.
const UsersTable = ({ canChangeStatus, canChangePlan }: { canChangeStatus: boolean; canChangePlan: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The person's page, with this list's filters and page to come back to.
  const personHref = usePersonHref();
  const { data: plansResponse } = useQuery(plansQuery());
  const plans = useMemo(() => plansResponse?.data ?? [], [plansResponse]);

  // The same query string the page prefetched with; the table's own config
  // waits for the plans and this page's status counts, which its tabs show.
  const queryString = buildTableQueryString(searchParams, USERS_TABLE_BASE_CONFIG);
  const query = useQuery({ ...ownersListQuery(queryString), placeholderData: keepPreviousData });
  const statusCounts = query.data?.data.statusCounts;
  const config = useMemo(() => buildUsersTableConfig(plans, statusCounts), [plans, statusCounts]);
  const { dataTableProps } = useServerDataTable<IOwnerOverviewItem>(config, { fetchPage: fetchUsersPage });
  const { activeDialog, activeRow, openDialog, closeDialog } = useRowDialogs<IOwnerOverviewItem, OwnerDialog>();
  // An outage isn't "no users match": say the list didn't load.
  const failed = query.isError && !query.data;

  // A deleted account can't be used, so it gets no new plan either.
  const actions = useMemo<DataTableActions<IOwnerOverviewItem>>(
    () => ({
      onView: (row) => router.push(personHref(row.userId)),
      extra: [
        {
          label: "Change plan",
          icon: ArrowLeftRight,
          onClick: (row) => openDialog("changePlan", row),
          hidden: (row) => !canChangePlan || row.status === "DELETED",
        },
        { label: "Activate", icon: UserCheck, onClick: (row) => openDialog("activate", row), hidden: (row) => !canChangeStatus || row.status !== "SUSPENDED" },
        {
          // The button's verb, apart from the Suspended status (both are সাময়িক বন্ধ otherwise).
          label: "Suspend@@action",
          icon: ShieldOff,
          destructive: true,
          onClick: (row) => openDialog("suspend", row),
          hidden: (row) => !canChangeStatus || row.status !== "ACTIVE",
        },
      ],
    }),
    [router, personHref, openDialog, canChangePlan, canChangeStatus],
  );

  return (
    <>
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        data={query.data?.data.items}
        columns={usersColumns}
        getRowId={(row) => row.userId}
        exportFileName="users"
        enableRowSelection
        toolbarRows={2}
        layout={{ rowHeight: 58 }}
        actions={actions}
        onRowClick={(row) => router.push(personHref(row.userId))}
        emptyMessage={failed ? "Couldn't load the users. Try again in a moment." : "No users match these filters."}
      />
      <OwnerDialogs owner={activeRow} activeDialog={activeDialog} onClose={closeDialog} plans={plans} />
    </>
  );
};

export default UsersTable;
