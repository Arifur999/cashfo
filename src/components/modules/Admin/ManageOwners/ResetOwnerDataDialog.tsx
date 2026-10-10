"use client";

import { resetOwnerDataAction } from "@/app/(dashboardLayout)/admin/manage-owners/_action";
import Callout from "@/components/shared/Callout";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { IOwnerOverviewItem } from "@/types/owner.types";

interface ResetOwnerDataDialogProps {
  owner: IOwnerOverviewItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ResetOwnerDataDialog = ({ owner, open, onOpenChange }: ResetOwnerDataDialogProps) => {
  const { run, isPending } = useActionMutation({
    action: (userId: string) => resetOwnerDataAction(userId),
    successMessage: "Owner data reset",
    invalidateKeys: [queryKeys.owners.all, queryKeys.workspaces.all],
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reset owner data"
      description={`${owner?.name ?? "This owner"}'s workspace "${owner?.businessName ?? ""}" will be reset to a fresh, empty state.`}
      variant="destructive"
      confirmLabel="Reset data"
      pendingLabel="Resetting..."
      isPending={isPending}
      // Irreversible, so the workspace name must be typed out first.
      confirmationText={owner?.businessName ?? undefined}
      onConfirm={async () => {
        if (owner && (await run(owner.userId))) {
          onOpenChange(false);
        }
      }}
    >
      <Callout variant="danger">
        Permanently deletes every transaction, account, contact, savings goal, asset and budget category in this workspace. This
        can&apos;t be undone. The owner&apos;s login stays intact.
      </Callout>
    </ConfirmDialog>
  );
};

export default ResetOwnerDataDialog;
