"use client";

import { Ban } from "lucide-react";
import { useId, useState } from "react";
import { suspendOwnerAction } from "@/app/(dashboardLayout)/admin/users/_action";
import ReasonDialog from "@/components/shared/dialog/ReasonDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { queryKeys } from "@/lib/queryKeys";
import type { IOwnerRef } from "@/types/owner.types";

interface SuspendOwnerDialogProps {
  owner: IOwnerRef;
  // How many devices are signed in right now, when the page knows (their
  // own page does; a list row doesn't).
  signedInDevices?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The AdminSuspendDialog board: the reason for the audit log, and "Also
// sign out of every device now", ticked unless the admin unticks it (then
// the devices stay signed in but every request is refused until the
// account is turned back on).
const SuspendOwnerDialog = ({ owner, signedInDevices, open, onOpenChange }: SuspendOwnerDialogProps) => {
  const { translate, locale } = useLocale();
  const checkboxId = useId();
  const [signOut, setSignOut] = useState(true);
  const { run, isPending } = useActionMutation({
    action: (reason: string) => suspendOwnerAction(owner.userId, { reason, signOutEverywhere: signOut }),
    successMessage: "Account suspended",
    invalidateKeys: [queryKeys.owners.all],
  });

  return (
    <ReasonDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        // Every open starts ticked, as the board draws it.
        if (!next) setSignOut(true);
      }}
      icon={Ban}
      title={translate("Suspend {name}?", { name: owner.name })}
      description="This immediately blocks the owner from logging in or using their account until reactivated."
      confirmLabel="Suspend account"
      confirmIcon={Ban}
      pendingLabel="Suspending..."
      variant="destructive"
      isPending={isPending}
      onSubmit={run}
    >
      <label htmlFor={checkboxId} className="flex cursor-pointer gap-2.5 rounded-[14px] border border-line bg-strip px-3.5 py-3">
        <Checkbox id={checkboxId} checked={signOut} onCheckedChange={(value) => setSignOut(value === true)} className="mt-0.5 size-4.5 rounded-[5px] bg-surface" />
        <span className="flex flex-col gap-0.5">
          <span className="text-body font-semibold text-ink">{translate("Also sign out of every device now")}</span>
          <span className="text-[12.5px] leading-[normal] text-ink-muted">
            {signedInDevices === undefined
              ? translate("Every phone and computer they use is signed out.")
              : signedInDevices === 0
                ? translate("No device is signed in at the moment.")
                : plural(translate, signedInDevices, "{count} device is signed in at the moment.", "{count} devices are signed in at the moment.", undefined, locale)}
          </span>
        </span>
      </label>
    </ReasonDialog>
  );
};

export default SuspendOwnerDialog;
