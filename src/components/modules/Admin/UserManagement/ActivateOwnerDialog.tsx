"use client";

import { activateOwnerAction } from "@/app/(dashboardLayout)/admin/users/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import type { IOwnerRef } from "@/types/owner.types";

interface ActivateOwnerDialogProps {
  owner: IOwnerRef;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Users calls them people with accounts, not owners: the words say whose
// account comes back on.
const ActivateOwnerDialog = ({ owner, open, onOpenChange }: ActivateOwnerDialogProps) => {
  const { translate } = useLocale();
  const { run, isPending } = useActionMutation({
    action: (userId: string) => activateOwnerAction(userId),
    successMessage: "Account turned back on",
    invalidateKeys: [queryKeys.owners.all],
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={translate("Turn {name}'s account back on?", { name: owner.name })}
      description={translate("{name} will be able to sign in and use their account again.", { name: owner.name })}
      // The same word as the button that opened it, and the pending label.
      confirmLabel="Turn back on"
      pendingLabel="Turning on..."
      isPending={isPending}
      onConfirm={async () => {
        if (await run(owner.userId)) {
          onOpenChange(false);
        }
      }}
    />
  );
};

export default ActivateOwnerDialog;
