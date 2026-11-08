"use client";

import { KeyRound, ShieldOff, SmartphoneNfc, UserCog, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import DataTableRowActions from "@/components/shared/table/DataTableRowActions";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IAdminAccount, IAdminInvite } from "@/types/adminAccount.types";
import type { AdminDialog } from "./AdminDialogs";

// The board's 32px row buttons.
const ROW_BUTTON = "h-8 px-2.5 text-[12.5px]";

interface AdminRowActionsProps {
  admin: IAdminAccount;
  isSelf: boolean;
  onOpen: (dialog: AdminDialog, admin: IAdminAccount) => void;
}

// "Change role" (or "Turn back on" for a suspended admin) as a button, and
// Reset password / Turn off two-step / Suspend behind the "..." menu.
// Nobody changes their own role, resets their own password or two-step here
// (that's My account) or suspends themselves -- the API refuses those too --
// so your own row renames you and leads to My account. Each button is named
// for its row, so a screen reader's list of buttons tells them apart.
const AdminRowActions = ({ admin, isSelf, onOpen }: AdminRowActionsProps) => {
  const { translate } = useLocale();
  const router = useRouter();
  const suspended = admin.status === "SUSPENDED";
  const primary: { label: string; ariaLabel?: string; dialog: AdminDialog } = suspended
    ? { label: "Turn back on", ariaLabel: translate("Turn back on: {name}", { name: admin.name }), dialog: "activate" }
    : isSelf
      ? { label: "Edit name", dialog: "edit" }
      : { label: "Change role", ariaLabel: translate("Change {name}'s role", { name: admin.name }), dialog: "edit" };

  return (
    <>
      <Button variant="secondary" size="xs" className={ROW_BUTTON} aria-label={primary.ariaLabel} onClick={() => onOpen(primary.dialog, admin)}>
        <T>{primary.label}</T>
      </Button>
      <DataTableRowActions
        row={admin}
        variant="action"
        actions={{
          rowLabel: (row) => row.name,
          extra: isSelf
            ? [{ label: "Open My account", icon: UserCog, onClick: () => router.push("/admin/account") }]
            : [
                // A suspended admin's name and role can still be changed.
                { label: "Change role", icon: UserCog, hidden: () => !suspended, onClick: (row) => onOpen("edit", row) },
                { label: "Reset password", icon: KeyRound, onClick: (row) => onOpen("resetPassword", row) },
                { label: "Turn off two-step", icon: SmartphoneNfc, hidden: (row) => row.twoFactorEnabled !== true, onClick: (row) => onOpen("twoStepOff", row) },
                { label: "Suspend", icon: ShieldOff, destructive: true, hidden: () => suspended, onClick: (row) => onOpen("suspend", row) },
              ],
        }}
      />
    </>
  );
};

interface InviteRowActionsProps {
  invite: IAdminInvite;
  isResending: boolean;
  onResend: (invite: IAdminInvite) => void;
  onCancel: (invite: IAdminInvite) => void;
}

// An open invite: send it again (a new link and seven new days), or cancel it.
export const InviteRowActions = ({ invite, isResending, onResend, onCancel }: InviteRowActionsProps) => {
  const { translate } = useLocale();
  return (
    <>
      <Button
        variant="secondary"
        size="xs"
        className={ROW_BUTTON}
        disabled={isResending}
        aria-label={translate("Resend invite to {email}", { email: invite.email })}
        onClick={() => onResend(invite)}
      >
        <T>{isResending ? "Sending..." : "Resend invite"}</T>
      </Button>
      <DataTableRowActions
        row={invite}
        variant="action"
        actions={{
          rowLabel: (row) => row.email,
          extra: [{ label: "Cancel invite", icon: XCircle, destructive: true, onClick: onCancel }],
        }}
      />
    </>
  );
};

export default AdminRowActions;
