"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { viewAsCustomerAction } from "@/app/(dashboardLayout)/admin/users/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import type { IOwnerRef } from "@/types/owner.types";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface ViewAsCustomerDialogProps {
  owner: IOwnerRef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// On success the action redirects into the customer app, so only a failure
// ever comes back here.
const ViewAsCustomerDialog = ({ owner, open, onOpenChange }: ViewAsCustomerDialogProps) => {
  const [isPending, startTransition] = useTransition();
  const { translate } = useLocale();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="View as customer"
      description={
        <T values={{ name: owner?.name ?? <T>this owner</T> }}>
          {"You will see the app exactly as {name} does, read-only: nothing can be changed, the password vault stays closed, and the view ends after an hour. It is recorded in the audit log. End it from the banner at the top to come back here."}
        </T>
      }
      confirmLabel="Open their view"
      pendingLabel="Opening..."
      isPending={isPending}
      onConfirm={() => {
        if (!owner) return;
        startTransition(async () => {
          const failed = await viewAsCustomerAction(owner.userId);
          if (failed) {
            toast.error(translate(failed.message));
          }
        });
      }}
    />
  );
};

export default ViewAsCustomerDialog;
