"use client";

import { suspendOwnerAction } from "@/app/(dashboardLayout)/admin/users/_action";
import ReasonDialog from "@/components/shared/dialog/ReasonDialog";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { IOwnerRef } from "@/types/owner.types";

interface SuspendOwnerDialogProps {
  owner: IOwnerRef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SuspendOwnerDialog = ({ owner, open, onOpenChange }: SuspendOwnerDialogProps) => {
  const { run, isPending } = useActionMutation({
    action: (reason: string) => suspendOwnerAction(owner?.userId ?? "", { reason }),
    successMessage: "Owner suspended",
    invalidateKeys: [queryKeys.owners.all],
  });

  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Suspend owner"
      description={owner?.name}
      warning="This immediately blocks the owner from logging in or using their account until they're reactivated."
      confirmLabel="Suspend"
      pendingLabel="Suspending..."
      variant="destructive"
      isPending={isPending}
      onSubmit={run}
    />
  );
};

export default SuspendOwnerDialog;
