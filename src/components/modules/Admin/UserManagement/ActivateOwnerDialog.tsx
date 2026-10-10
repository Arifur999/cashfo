"use client";

import { activateOwnerAction } from "@/app/(dashboardLayout)/admin/users/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { IOwnerRef } from "@/types/owner.types";

interface ActivateOwnerDialogProps {
  owner: IOwnerRef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ActivateOwnerDialog = ({ owner, open, onOpenChange }: ActivateOwnerDialogProps) => {
  const { run, isPending } = useActionMutation({
    action: (userId: string) => activateOwnerAction(userId),
    successMessage: "Owner activated",
    invalidateKeys: [queryKeys.owners.all],
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Activate owner"
      description={`${owner?.name ?? "This owner"} will be able to sign in and use their account again.`}
      confirmLabel="Activate"
      pendingLabel="Activating..."
      isPending={isPending}
      onConfirm={async () => {
        if (owner && (await run(owner.userId))) {
          onOpenChange(false);
        }
      }}
    />
  );
};

export default ActivateOwnerDialog;
