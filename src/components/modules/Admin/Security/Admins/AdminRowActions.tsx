"use client";

import { KeyRound, ShieldOff } from "lucide-react";
import DataTableRowActions from "@/components/shared/table/DataTableRowActions";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IAdminAccount } from "@/types/adminAccount.types";
import type { AdminDialog } from "./AdminDialogs";

interface AdminRowActionsProps {
  admin: IAdminAccount;
  isSelf: boolean;
  onOpen: (dialog: AdminDialog, admin: IAdminAccount) => void;
}

// "Edit" (or "Turn back on" for a suspended admin) as a button, and Reset
// password / Suspend behind the "..." menu. Edit changes another admin's
// name and role, so it isn't called "Change role". Nobody resets their own
// password here (that's My account) or suspends themselves -- the API
// refuses that too -- so your own row only edits your name. Each button is
// named for its row, so a screen reader's list of buttons tells them apart.
const AdminRowActions = ({ admin, isSelf, onOpen }: AdminRowActionsProps) => {
  const { translate } = useLocale();
  const suspended = admin.status === "SUSPENDED";
  const primary: { label: string; ariaLabel?: string; dialog: AdminDialog } = suspended
    ? { label: "Turn back on", ariaLabel: translate("Turn back on: {name}", { name: admin.name }), dialog: "activate" }
    : isSelf
      ? { label: "Edit name", dialog: "edit" }
      : { label: "Edit", ariaLabel: translate("Edit {name}", { name: admin.name }), dialog: "edit" };

  return (
    <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
      <Button variant="secondary" size="sm" aria-label={primary.ariaLabel} onClick={() => onOpen(primary.dialog, admin)}>
        <T>{primary.label}</T>
      </Button>
      {!isSelf && !suspended && (
        <DataTableRowActions
          row={admin}
          variant="outline"
          // smartly's 36px, level with the size-sm Edit beside it.
          size="sm"
          actions={{
            rowLabel: (row) => row.name,
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
