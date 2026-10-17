"use client";

import { Trash2 } from "lucide-react";
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
  const workspace = owner?.businessName ?? "this workspace";
  const { run, isPending } = useActionMutation({
    action: (userId: string) => resetOwnerDataAction(userId),
    successMessage: "Owner data reset",
    invalidateKeys: [queryKeys.owners.all, queryKeys.workspaces.all],
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Reset all data in ${workspace}?`}
      description={
        <>
          This permanently deletes all transactions, accounts, contacts, savings goals, assets, and budget categories for{" "}
          <b className="font-semibold text-ink">{workspace}</b>. Their account login stays intact.
        </>
      }
      variant="destructive"
      confirmLabel="Reset / delete all data"
      confirmIcon={Trash2}
      pendingLabel="Resetting..."
      isPending={isPending}
      // Irreversible, so the workspace name must be typed out first.
      confirmationText={owner?.businessName ?? undefined}
      confirmationLabel="Type the workspace name to confirm:"
      confirmationMatchedText="Matches the workspace name"
      onConfirm={async () => {
        if (owner && (await run(owner.userId))) {
          onOpenChange(false);
        }
      }}
    >
      <Callout variant="danger" className="font-semibold">
        This can&apos;t be undone.
      </Callout>
    </ConfirmDialog>
  );
};

export default ResetOwnerDataDialog;
