"use client";

import { useState } from "react";
import { activateAdminAction, resetAdminPasswordAction, suspendAdminAction } from "@/app/(dashboardLayout)/admin/security/(sections)/admins/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import FormDialog from "@/components/shared/dialog/FormDialog";
import TemporaryPasswordDialog from "@/components/shared/dialog/TemporaryPasswordDialog";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { IAdminAccount } from "@/types/adminAccount.types";
import EditAdminForm from "./EditAdminForm";

export type AdminDialog = "edit" | "resetPassword" | "suspend" | "activate";

interface AdminDialogsProps {
  admin: IAdminAccount | null;
  activeDialog: AdminDialog | null;
  currentAdminId: string | null;
  onClose: () => void;
}

// Every row-level admin dialog in one place.
const AdminDialogs = ({ admin, activeDialog, currentAdminId, onClose }: AdminDialogsProps) => {
  const [revealed, setRevealed] = useState<{ name: string; password: string } | null>(null);

  const resetPassword = useActionMutation({
    action: resetAdminPasswordAction,
    successMessage: "Password reset",
    onSuccess: ({ temporaryPassword }) => setRevealed({ name: admin?.name ?? "", password: temporaryPassword }),
    refreshRoute: false,
  });
  const suspend = useActionMutation({
    action: suspendAdminAction,
    successMessage: (suspended) => `${suspended.name} suspended`,
    invalidateKeys: [queryKeys.admins.all],
    refreshRoute: false,
  });

  const activate = useActionMutation({
    action: activateAdminAction,
    successMessage: (activated) => `${activated.name} can sign in again`,
    invalidateKeys: [queryKeys.admins.all],
    refreshRoute: false,
  });

  const dialogProps = (dialog: AdminDialog) => ({
    open: activeDialog === dialog && admin !== null,
    onOpenChange: (open: boolean) => {
      if (!open) onClose();
    },
  });

  return (
    <>
      <FormDialog title="Edit admin" description={admin?.email} size="sm" {...dialogProps("edit")}>
        {admin && <EditAdminForm admin={admin} isSelf={admin.id === currentAdminId} onDone={onClose} />}
      </FormDialog>

      <ConfirmDialog
        {...dialogProps("resetPassword")}
        title="Reset password"
        description={`${admin?.name}'s current password stops working and a new temporary one is generated. You'll see it once.`}
        confirmLabel="Reset password"
        pendingLabel="Resetting..."
        isPending={resetPassword.isPending}
        onConfirm={async () => {
          if (admin && (await resetPassword.run(admin.id))) onClose();
        }}
      />

      <ConfirmDialog
        {...dialogProps("suspend")}
        title="Suspend admin"
        description={`${admin?.name} is signed out everywhere and can't sign in until reactivated.`}
        variant="destructive"
        confirmLabel="Suspend"
        pendingLabel="Suspending..."
        confirmationText={admin?.email}
        isPending={suspend.isPending}
        onConfirm={async () => {
          if (admin && (await suspend.run(admin.id))) onClose();
        }}
      />

      <ConfirmDialog
        {...dialogProps("activate")}
        title="Reactivate admin"
        description={`${admin?.name} can sign in again with their current password, with the same role.`}
        confirmLabel="Reactivate"
        pendingLabel="Reactivating..."
        isPending={activate.isPending}
        onConfirm={async () => {
          if (admin && (await activate.run(admin.id))) onClose();
        }}
      />

      <TemporaryPasswordDialog password={revealed?.password ?? null} accountName={revealed?.name} onClose={() => setRevealed(null)} />
    </>
  );
};

export default AdminDialogs;
