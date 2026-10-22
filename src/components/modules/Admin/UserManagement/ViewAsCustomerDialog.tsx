"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { viewAsCustomerAction } from "@/app/(dashboardLayout)/admin/users/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IOwnerRef } from "@/types/owner.types";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

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
  const codeId = useId();
  const [code, setCode] = useState("");
  const ready = /^\d{6}$/.test(code);

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
      <div className="flex flex-col gap-2">
        <Label htmlFor={codeId} className="text-body font-medium text-ink">
          {translate("Support code from the customer")}
        </Label>
        <Input
          id={codeId}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          maxLength={6}
          aria-describedby={`${codeId}-hint`}
          className="h-11 rounded-md border-line-strong bg-surface font-mono text-body-lg tracking-[0.3em] text-ink"
        />
        <span id={`${codeId}-hint`} className="text-small text-ink-muted">
          {translate("Ask the customer to open Settings › Security › Support access and read you the code. It works once, for 15 minutes. Never ask for their password.")}
        </span>
      </div>
    </ConfirmDialog>
  );
};

export default ViewAsCustomerDialog;
