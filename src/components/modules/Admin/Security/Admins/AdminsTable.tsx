"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRound, ShieldOff } from "lucide-react";
import { useMemo } from "react";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { adminAccountsQuery } from "@/queries/security.queries";
import type { IAdminAccount } from "@/types/adminAccount.types";
import AdminDialogs, { type AdminDialog } from "./AdminDialogs";
import { ADMIN_FILTERS } from "./adminOptions";
import { ADMINS_HIDDEN_COLUMNS, buildAdminsColumns } from "./adminsColumns";
import CreateAdminDialog from "./CreateAdminDialog";

const AdminsTable = ({ currentAdminId }: { currentAdminId: string | null }) => {
  const { data, isLoading, isFetching } = useQuery(adminAccountsQuery());
  const columns = useMemo(() => buildAdminsColumns(currentAdminId), [currentAdminId]);
  const { activeDialog, activeRow, openDialog, closeDialog } = useRowDialogs<IAdminAccount, AdminDialog>();

  const actions = useMemo<DataTableActions<IAdminAccount>>(
    () => ({
      onEdit: (row) => openDialog("edit", row),
      extra: [
        { label: "Reset password", icon: KeyRound, onClick: (row) => openDialog("resetPassword", row), hidden: (row) => row.status !== "ACTIVE" },
        {
          label: "Suspend",
          icon: ShieldOff,
          destructive: true,
          onClick: (row) => openDialog("suspend", row),
          // Nobody can suspend themselves (the API refuses it too).
          hidden: (row) => row.status !== "ACTIVE" || row.id === currentAdminId,
        },
      ],
    }),
    [openDialog, currentAdminId],
  );

  return (
    <>
      <DataTable
        data={data?.data}
        columns={columns}
        getRowId={(row) => row.id}
        tableId="admin-accounts"
        defaultHiddenColumns={ADMINS_HIDDEN_COLUMNS}
        isLoading={isLoading}
        isFetching={isFetching}
        search={{ placeholder: "Search admins..." }}
        filters={{ configs: ADMIN_FILTERS }}
        exportFileName="admin-accounts"
        actions={actions}
        toolbarAction={<CreateAdminDialog />}
        emptyMessage="No admin accounts match these filters."
      />
      <AdminDialogs admin={activeRow} activeDialog={activeDialog} currentAdminId={currentAdminId} onClose={closeDialog} />
    </>
  );
};

export default AdminsTable;
