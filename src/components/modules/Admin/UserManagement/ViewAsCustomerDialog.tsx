"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { viewAsCustomerAction } from "@/app/(dashboardLayout)/admin/users/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import type { IOwnerRef } from "@/types/owner.types";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { isSupportCode, SupportCodeField } from "./SupportCodeField";

interface ViewAsCustomerDialogProps {
  owner: IOwnerRef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The view opens only with the customer's consent: the 6-digit support code
// they make in Settings > Security and read out to you. On success the
// action redirects into the customer app, so only a failure comes back here.
const ViewAsCustomerDialog = ({ owner, open, onOpenChange }: ViewAsCustomerDialogProps) => {
  const [isPending, startTransition] = useTransition();
  const { translate } = useLocale();
  const [code, setCode] = useState("");
  const ready = isSupportCode(code);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        // Every opening starts with an empty code.
        if (!next) setCode("");
        onOpenChange(next);
      }}
      title="View as customer"
      description={
        <T values={{ name: owner?.name ?? <T>this owner</T> }}>
          {"You will see the app exactly as {name} does, read-only: nothing can be changed, the password vault stays closed, and the view ends after an hour. It is recorded in the audit log. End it from the banner at the top to come back here."}
        </T>
      }
      confirmLabel="Open their view"
      pendingLabel="Opening..."
      isPending={isPending}
      confirmDisabled={!ready}
      onConfirm={() => {
        if (!owner || !ready) return;
        startTransition(async () => {
          const failed = await viewAsCustomerAction(owner.userId, code);
          if (failed) {
            toast.error(translate(failed.message));
          }
        });
      }}
    >
      <SupportCodeField value={code} onChange={setCode} />
    </ConfirmDialog>
  );
};

export default ViewAsCustomerDialog;
