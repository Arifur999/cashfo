"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { adminAccountsQuery } from "@/queries/security.queries";
import type { IAdminAccount } from "@/types/adminAccount.types";
import AdminDialogs, { type AdminDialog } from "./AdminDialogs";
import { buildAdminsColumns } from "./adminsColumns";

// You first, then everyone who can sign in, then the suspended; by name.
const teamOrder = (admins: IAdminAccount[], currentAdminId: string | null) =>
  [...admins].sort((a, b) => {
    const rank = (admin: IAdminAccount) => (admin.id === currentAdminId ? 0 : admin.status === "ACTIVE" ? 1 : 2);
    return rank(a) - rank(b) || a.name.localeCompare(b.name);
  });

// The whole team fits on one card, so there is nothing to search or page.
const AdminsTable = ({ currentAdminId }: { currentAdminId: string | null }) => {
  const { data, isLoading, isFetching } = useQuery(adminAccountsQuery());
  const { activeDialog, activeRow, openDialog, closeDialog } = useRowDialogs<IAdminAccount, AdminDialog>();
  const columns = useMemo(() => buildAdminsColumns(currentAdminId, openDialog), [currentAdminId, openDialog]);
  const rows = useMemo(() => (data?.data ? teamOrder(data.data, currentAdminId) : undefined), [data, currentAdminId]);

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        isFetching={isFetching}
        hideToolbar
        initialPageSize={100}
        footer="The ⋯ menu has Reset password and Suspend. You can't suspend yourself or change your own role, so the panel always keeps a super admin."
        emptyMessage="No admins yet."
      />
      <AdminDialogs admin={activeRow} activeDialog={activeDialog} currentAdminId={currentAdminId} onClose={closeDialog} />
    </>
  );
};

export default AdminsTable;
