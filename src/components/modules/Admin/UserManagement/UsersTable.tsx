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

  // A deleted account can't be used, so it gets no new plan either.
  const actions = useMemo<DataTableActions<IOwnerOverviewItem>>(
    () => ({
      // "Open row actions for Rahim Uddin", to a screen reader.
      rowLabel: (row) => row.name,
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
        // On a narrow screen the box, phone, workspace and plan keep their
        // widths and the list scrolls sideways, instead of crushing them.
        // That is 898px of tracks and padding plus the name's 200: 1098px,
        // which fits the 1440 card (1134 inside, 1117 beside a scrollbar).
        // A card under 1098px (a 1280 or 1366 laptop) scrolls too.
        layout={{ rowHeight: 58, flexMinWidth: 200 }}
        actions={actions}
        // A click opens the person. (Not rowHref yet: its row link would
        // prefetch every person on the page.)
        onRowClick={(row) => router.push(personHref(row.userId))}
        emptyMessage="No users match these filters."
        // An outage isn't "no users match": the table says the list didn't
        // load, with Try again.
        errorTitle="Couldn't load the users"
      />
      <OwnerDialogs owner={activeRow} activeDialog={activeDialog} onClose={closeDialog} plans={plans} />
    </>
  );
};

export default UsersTable;
