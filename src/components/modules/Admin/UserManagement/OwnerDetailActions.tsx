"use client";

import { Ban, Download, Eye, MoreHorizontal, ShieldOff, Trash2, Undo2, UserCheck } from "lucide-react";
import { useState } from "react";
import { disableOwnerTwoStepAction } from "@/app/(dashboardLayout)/admin/users/_action";
import ResetOwnerDataDialog from "@/components/modules/Admin/ManageOwners/ResetOwnerDataDialog";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import type { IOwnerDetail, IOwnerRef, OwnerDialog } from "@/types/owner.types";
import type { PlanChoice } from "./ChangeOwnerPlanForm";
import { downloadOwnerCopy } from "./ownerCopy";
import OwnerDialogs from "./OwnerDialogs";
import ResetOwnerPasswordButton from "./ResetOwnerPasswordButton";
import ViewAsCustomerDialog from "./ViewAsCustomerDialog";

interface OwnerDetailActionsProps {
  // The dialogs' fields, plus what Reset data names and checks.
  owner: IOwnerRef & Pick<IOwnerDetail, "email" | "businessId" | "businessName" | "workspaceCount" | "twoFactorEnabled" | "signedInDevices">;
  plans: PlanChoice[];
  // What this admin's role may do (MANAGE_ROLES ownerStatus / ownerPlan).
  canChangeStatus: boolean;
  canChangePlan: boolean;
  // MANAGE_ROLES ownerView: a read-only look at the customer app as them.
  canViewAsCustomer: boolean;
  // MANAGE_ROLES ownerData: wiping their personal workspace back to a fresh
  // start (and the copy offered first), as Owners' row button does.
  canResetData: boolean;
  // MANAGE_ROLES ownerTwoStep: turning off two-step for a lost phone.
  canDisableTwoStep: boolean;
}

// The board's 38px pills; 44px under a finger. Suspend outlined in red.
const BUTTON = "h-9.5 px-3.5 pointer-coarse:h-11";
const DANGER = "border-expense-line text-expense hover:bg-expense-soft";

// The person page's actions, as the AdminUserDetail board lays them out:
// Change plan, Reset password, Suspend (or Activate), then the rest behind
// "⋯" -- View as customer, Download a copy, Turn off two-step, Cancel the
// deletion, Reset data. The dialogs are the ones the users table opens from
// its row menu, and Reset data the one Owners opens.
const OwnerDetailActions = ({ owner, plans, canChangeStatus, canChangePlan, canViewAsCustomer, canResetData, canDisableTwoStep }: OwnerDetailActionsProps) => {
  const { translate } = useLocale();
  const [activeDialog, setActiveDialog] = useState<OwnerDialog | null>(null);
  const [viewing, setViewing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [twoStepOff, setTwoStepOff] = useState(false);
  const [copying, setCopying] = useState(false);
  const disableTwoStep = useActionMutation({
    action: () => disableOwnerTwoStepAction(owner.userId),
    successMessage: "Two-step verification is off",
    invalidateKeys: [queryKeys.owners.all],
  });
  // A deleted account can't be used: no new plan, password or status.
  const gone = owner.status === "DELETED" || owner.status === "PENDING_DELETION";
  const canView = canViewAsCustomer && owner.status === "ACTIVE";
  // Only an account with a workspace has data to reset or copy.
  const canReset = canResetData && owner.businessId !== null && owner.status !== "DELETED";
  const canCopy = canResetData && owner.status !== "DELETED";
  const canTwoStep = canDisableTwoStep && owner.twoFactorEnabled === true;
  const canRestore = canChangeStatus && owner.status === "PENDING_DELETION";
  const menu = canView || canCopy || canTwoStep || canRestore || canReset;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canChangePlan && !gone && (
        <Button variant="secondary" className={BUTTON} onClick={() => setActiveDialog("changePlan")}>
          <T>Change plan</T>
        </Button>
      )}
      {/* The roles that suspend a customer can also let one back in. */}
      {canChangeStatus && !gone && <ResetOwnerPasswordButton owner={owner} className={BUTTON} />}
      {canChangeStatus && owner.status === "SUSPENDED" && (
        <Button variant="secondary" className={BUTTON} onClick={() => setActiveDialog("activate")}>
          <UserCheck className="size-3.75 text-ink-2" aria-hidden="true" /> <T>Turn back on</T>
        </Button>
      )}
      {canChangeStatus && owner.status === "ACTIVE" && (
        <Button variant="secondary" className={`${BUTTON} ${DANGER}`} onClick={() => setActiveDialog("suspend")}>
          {/* The verb, so it never reads like the Suspended badge beside the name. */}
          <Ban className="size-3.75" aria-hidden="true" /> <T>Suspend@@action</T>
        </Button>
      )}
      {canRestore && (
        <Button variant="secondary" className={BUTTON} onClick={() => setActiveDialog("restore")}>
          <Undo2 className="size-3.75 text-ink-2" aria-hidden="true" /> <T>Cancel the deletion</T>
        </Button>
      )}
      {menu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="size-9.5 pointer-coarse:size-11" aria-label={translate("More for {name}", { name: owner.name })}>
              <MoreHorizontal className="size-4.5 text-ink-2" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {canView && (
              <DropdownMenuItem onClick={() => setViewing(true)}>
                <Eye aria-hidden="true" /> <T>View as customer</T>
              </DropdownMenuItem>
            )}
            {canCopy && (
              <DropdownMenuItem
                disabled={copying}
                onClick={async () => {
                  setCopying(true);
                  await downloadOwnerCopy(owner.userId, translate);
                  setCopying(false);
                }}
              >
                <Download aria-hidden="true" /> <T>Download a copy</T>
              </DropdownMenuItem>
            )}
            {canTwoStep && (
              <DropdownMenuItem onClick={() => setTwoStepOff(true)}>
                <ShieldOff aria-hidden="true" /> <T>Turn off two-step</T>
              </DropdownMenuItem>
            )}
            {canRestore && (
              <DropdownMenuItem onClick={() => setActiveDialog("restore")}>
                <Undo2 aria-hidden="true" /> <T>Cancel the deletion</T>
              </DropdownMenuItem>
            )}
            {canReset && (canView || canCopy || canTwoStep || canRestore) && <DropdownMenuSeparator />}
            {canReset && (
              <DropdownMenuItem variant="destructive" onClick={() => setResetting(true)}>
                <Trash2 aria-hidden="true" /> <T>Reset data</T>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <OwnerDialogs owner={owner} activeDialog={activeDialog} onClose={() => setActiveDialog(null)} plans={plans} signedInDevices={owner.signedInDevices} />
      <ViewAsCustomerDialog owner={owner} open={viewing} onOpenChange={setViewing} />
      {canReset && <ResetOwnerDataDialog owner={owner} open={resetting} onOpenChange={setResetting} canDownloadCopy={canCopy} />}
      <ConfirmDialog
        open={twoStepOff}
        onOpenChange={setTwoStepOff}
        icon={ShieldOff}
        variant="destructive"
        title={translate("Turn off two-step verification for {name}?", { name: owner.name })}
        description="Only for someone who lost their phone and their backup codes. They sign in with their password alone until they turn it on again, and they are told by email."
        confirmLabel="Turn off two-step"
        pendingLabel="Turning off..."
        isPending={disableTwoStep.isPending}
        onConfirm={async () => {
          if (await disableTwoStep.run(undefined)) setTwoStepOff(false);
        }}
      />
    </div>
  );
};

export default OwnerDetailActions;
