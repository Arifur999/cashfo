"use client";

import { suspendOwnerAction } from "@/app/(dashboardLayout)/admin/users/_action";
import ReasonDialog from "@/components/shared/dialog/ReasonDialog";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import type { IOwnerRef } from "@/types/owner.types";

interface SuspendOwnerDialogProps {
  owner: IOwnerRef;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The backend signs them out on every device at once (not just on their
// next request), so the dialog says that, as Reset password does.
const SuspendOwnerDialog = ({ owner, open, onOpenChange }: SuspendOwnerDialogProps) => {
  const { translate } = useLocale();
  const { run, isPending } = useActionMutation({
    action: (reason: string) => suspendOwnerAction(owner.userId, { reason }),
    successMessage: "Account suspended",
    invalidateKeys: [queryKeys.owners.all],
  });

  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={translate("Suspend {name}?", { name: owner.name })}
      description="They're signed out on every device straight away and can't sign in until you turn the account back on."
      confirmLabel="Suspend account"
      pendingLabel="Suspending..."
      variant="destructive"
      isPending={isPending}
      onSubmit={run}
    />
  );
};

export default SuspendOwnerDialog;
