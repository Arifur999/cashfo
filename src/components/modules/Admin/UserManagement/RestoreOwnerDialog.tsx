"use client";

import { Undo2 } from "lucide-react";
import { restoreOwnerAction } from "@/app/(dashboardLayout)/admin/users/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import type { IOwnerRef } from "@/types/owner.types";

interface RestoreOwnerDialogProps {
  owner: IOwnerRef;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Cancels a customer's "Delete my account" inside its 30 days, for someone
// who asked support to keep it (signing in would do the same).
const RestoreOwnerDialog = ({ owner, open, onOpenChange }: RestoreOwnerDialogProps) => {
  const { translate } = useLocale();
  const { run, isPending } = useActionMutation({
    action: () => restoreOwnerAction(owner.userId),
    successMessage: "The account is kept",
    invalidateKeys: [queryKeys.owners.all],
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Undo2}
      title={translate("Keep {name}'s account?", { name: owner.name })}
      description={translate("This cancels the deletion they asked for. Their account and data stay, and they can sign in again.")}
      confirmLabel="Keep the account"
      pendingLabel="Saving..."
      isPending={isPending}
      onConfirm={async () => {
        if (await run(undefined)) onOpenChange(false);
      }}
    />
  );
};

export default RestoreOwnerDialog;
