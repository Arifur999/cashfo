"use client";

import { KeyRound, ShieldOff } from "lucide-react";
import DataTableRowActions from "@/components/shared/table/DataTableRowActions";
import { Button } from "@/components/ui/button";
import type { IAdminAccount } from "@/types/adminAccount.types";
import type { AdminDialog } from "./AdminDialogs";

interface AdminRowActionsProps {
  admin: IAdminAccount;
  isSelf: boolean;
  onOpen: (dialog: AdminDialog, admin: IAdminAccount) => void;
}

// "Change role" (or "Turn back on" for a suspended admin) as a button, and
// Reset password / Suspend behind the "..." menu. Nobody resets their own
// password here (that's My account) or suspends themselves -- the API
// refuses that too -- so your own row only edits your name.
const AdminRowActions = ({ admin, isSelf, onOpen }: AdminRowActionsProps) => {
  const suspended = admin.status === "SUSPENDED";
  const primary: { label: string; dialog: AdminDialog } = suspended
    ? { label: "Turn back on", dialog: "activate" }
    : { label: isSelf ? "Edit name" : "Change role", dialog: "edit" };

  return (
    <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 rounded-md border-line-strong bg-surface px-3 text-small font-semibold whitespace-nowrap text-ink hover:bg-cream"
        onClick={() => onOpen(primary.dialog, admin)}
      >
        {primary.label}
      </Button>
      {!isSelf && !suspended && (
        <DataTableRowActions
          row={admin}
          variant="outline"
          actions={{
            extra: [
              { label: "Reset password", icon: KeyRound, onClick: (row) => onOpen("resetPassword", row) },
              { label: "Suspend", icon: ShieldOff, destructive: true, onClick: (row) => onOpen("suspend", row) },
            ],
          }}
        />
      )}
    </div>
  );
};

export default AdminRowActions;
