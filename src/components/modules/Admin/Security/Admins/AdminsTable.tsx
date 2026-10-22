"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import ErrorState from "@/components/smartly/ErrorState";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
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
  const { translate } = useLocale();
  const query = useQuery(adminAccountsQuery());
  const { data, isLoading, isFetching } = query;
  const { activeDialog, activeRow, openDialog, closeDialog } = useRowDialogs<IAdminAccount, AdminDialog>();
  const columns = useMemo(() => buildAdminsColumns(currentAdminId, openDialog), [currentAdminId, openDialog]);
  const rows = useMemo(() => (data?.data ? teamOrder(data.data, currentAdminId) : undefined), [data, currentAdminId]);

  // The viewer is an admin, so an empty team can only mean the read failed.
  if (query.isError && !data) {
    return <ErrorState title={translate("Couldn't load the admin team")} onRetry={() => void query.refetch()} className="shadow-card" />;
  }

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        // The density scale's relaxed row: a name over an email. Each column
        // keeps its px, so a role chip never runs into Last sign-in on a
        // phone: the name column gives way, then the table scrolls sideways.
        layout={{ rowHeight: 64, headPadding: 12, flexMinWidth: 200 }}
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
